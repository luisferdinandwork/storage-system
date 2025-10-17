// app/api/items/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemStock } from '@/lib/db/schema';
import { parseProductCode } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmin and item-master can import items
    if (session.user.role !== 'superadmin' && session.user.role !== 'item-master') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file type
    const fileName = file.name.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    if (!isCsv && !isExcel) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload a CSV or Excel file.' 
      }, { status: 400 });
    }

    // Read file content
    const fileContent = await file.text();
    
    if (isExcel) {
      return NextResponse.json({ 
        error: 'Excel files must be converted to CSV format before importing. Please save your Excel file as CSV and try again.' 
      }, { status: 400 });
    }

    // Parse CSV
    const rows = parseCsv(fileContent);

    if (rows.length < 2) {
      return NextResponse.json({ error: 'File is empty or contains no data rows' }, { status: 400 });
    }

    // Extract and validate headers
    const headers = rows[0].map(h => h.trim());
    
    // Required headers
    const requiredHeaders = [
      'Product Code',
      'Description',
      'Total Stock',
      'Period',
      'Season',
      'Unit of Measure'
    ];
    
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      return NextResponse.json({ 
        error: `Missing required columns: ${missingHeaders.join(', ')}` 
      }, { status: 400 });
    }

    // Process data rows
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string; productCode?: string }>
    };

    // Get column indices
    const getColumnIndex = (headerName: string) => headers.findIndex(h => h === headerName);
    
    const productCodeIdx = getColumnIndex('Product Code');
    const descriptionIdx = getColumnIndex('Description');
    const totalStockIdx = getColumnIndex('Total Stock');
    const periodIdx = getColumnIndex('Period');
    const seasonIdx = getColumnIndex('Season');
    const unitIdx = getColumnIndex('Unit of Measure');
    const conditionIdx = getColumnIndex('Condition');
    const conditionNotesIdx = getColumnIndex('Condition Notes');
    const locationIdx = getColumnIndex('Location');

    // Process each data row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip empty rows
      if (row.every(cell => !cell.trim())) continue;
      
      try {
        // Extract data from row
        const productCode = row[productCodeIdx]?.trim();
        const description = row[descriptionIdx]?.trim();
        const totalStockStr = row[totalStockIdx]?.trim();
        const period = row[periodIdx]?.trim();
        const season = row[seasonIdx]?.trim();
        const unitOfMeasure = row[unitIdx]?.trim();
        const condition = conditionIdx >= 0 ? row[conditionIdx]?.trim()?.toLowerCase() : null;
        const conditionNotes = conditionNotesIdx >= 0 ? row[conditionNotesIdx]?.trim() : null;
        const location = locationIdx >= 0 ? row[locationIdx]?.trim() : null;

        // Validate required fields
        if (!productCode) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            error: 'Product Code is required'
          });
          continue;
        }

        if (!description) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            productCode,
            error: 'Description is required'
          });
          continue;
        }

        if (!totalStockStr || isNaN(parseInt(totalStockStr))) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            productCode,
            error: 'Total Stock must be a valid number'
          });
          continue;
        }

        const totalStock = parseInt(totalStockStr);

        if (!period || !season || !unitOfMeasure) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            productCode,
            error: 'Missing required fields (Period, Season, Unit of Measure)'
          });
          continue;
        }

        // Validate unit of measure
        if (unitOfMeasure !== 'PCS' && unitOfMeasure !== 'PRS') {
          results.failed++;
          results.errors.push({
            row: i + 1,
            productCode,
            error: 'Unit of Measure must be either PCS or PRS'
          });
          continue;
        }

        // Validate condition if provided
        if (condition) {
          const validConditions = ['excellent', 'good', 'fair', 'poor'];
          if (!validConditions.includes(condition)) {
            results.failed++;
            results.errors.push({
              row: i + 1,
              productCode,
              error: `Condition must be one of: ${validConditions.join(', ')}`
            });
            continue;
          }
        }

        // Validate location if provided
        const validLocations = ['Storage 1', 'Storage 2', 'Storage 3'];
        if (location && location !== '' && !validLocations.includes(location)) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            productCode,
            error: `Location must be one of: ${validLocations.join(', ')}, or empty`
          });
          continue;
        }

        // Parse product code to extract auto-generated fields
        const parsed = parseProductCode(productCode);
        
        if (!parsed.isValid) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            productCode,
            error: `Invalid product code: ${parsed.error}`
          });
          continue;
        }

        // Check for duplicate product code
        const existingItem = await db
          .select({ id: items.id })
          .from(items)
          .where(eq(items.productCode, productCode))
          .limit(1);

        if (existingItem.length > 0) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            productCode,
            error: 'Product code already exists in database'
          });
          continue;
        }

        // Create the item
        await db.insert(items).values({
          productCode,
          description,
          brandCode: parsed.brandCode,
          productDivision: parsed.productDivision,
          productCategory: parsed.productCategory,
          totalStock,
          period,
          season,
          unitOfMeasure: unitOfMeasure as 'PCS' | 'PRS',
          status: 'pending_approval',
          createdBy: session.user.id,
        });

        // Create item stock record
        await db.insert(itemStock).values({
          itemId: (await db.select({ id: items.id }).from(items).where(eq(items.productCode, productCode)).limit(1))[0].id,
          pending: 0,
          inStorage: totalStock,
          onBorrow: 0,
          inClearance: 0,
          seeded: 0,
          location: location && location !== '' ? location as 'Storage 1' | 'Storage 2' | 'Storage 3' : null,
          condition: condition as 'excellent' | 'good' | 'fair' | 'poor' || 'excellent',
          conditionNotes: conditionNotes || null,
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          productCode: row[productCodeIdx]?.trim(),
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }

    return NextResponse.json({
      message: `Import completed. ${results.success} items imported successfully, ${results.failed} failed.`,
      results
    });
  } catch (error) {
    console.error('Error importing items:', error);
    return NextResponse.json({ 
      error: 'Failed to import items',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Parse CSV content into rows
 * Handles quoted fields containing commas, newlines, and quotes
 */
function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
        i++;
      } else if (char === ',') {
        // Field separator
        currentRow.push(currentField);
        currentField = '';
        i++;
      } else if (char === '\r' && nextChar === '\n') {
        // Windows line ending
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i += 2;
      } else if (char === '\n' || char === '\r') {
        // Unix/Mac line ending
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  // Add last field and row if not empty
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}
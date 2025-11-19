// app/api/items/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemStock, itemImages, itemRequests, stockMovements, users } from '@/lib/db/schema';
import { parseProductCode } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if email exists
    if (!session.user.email) {
      return NextResponse.json({ error: 'User email not found in session' }, { status: 401 });
    }

    // Only superadmin and item-master can import items
    if (session.user.role !== 'superadmin' && session.user.role !== 'item-master') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the actual user ID from the database
    const userEmail = session.user.email;
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
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

    let rows: any[][] = [];
    
    if (isExcel) {
      // Handle Excel file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      rows = jsonData;
    } else {
      // Handle CSV file
      const fileContent = await file.text();
      rows = parseCsv(fileContent);
    }

    if (rows.length < 2) {
      return NextResponse.json({ error: 'File is empty or contains no data rows' }, { status: 400 });
    }

    // Extract and validate headers
    const headers = rows[0].map((h: any) => String(h).trim());
    
    // Required headers (removed Box ID)
    const requiredHeaders = [
      'Product Code',
      'Description',
      'Initial Stock',
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
    const initialStockIdx = getColumnIndex('Initial Stock');
    const periodIdx = getColumnIndex('Period');
    const seasonIdx = getColumnIndex('Season');
    const unitIdx = getColumnIndex('Unit of Measure');
    const conditionIdx = getColumnIndex('Condition');
    const conditionNotesIdx = getColumnIndex('Condition Notes');
    // Removed boxIdIdx

    // Process each data row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip empty rows
      if (row.every((cell: any) => !String(cell).trim())) continue;
      
      try {
        // Extract data from row
        const productCode = String(row[productCodeIdx] || '').trim();
        const description = String(row[descriptionIdx] || '').trim();
        const initialStockStr = String(row[initialStockIdx] || '').trim();
        const period = String(row[periodIdx] || '').trim();
        const season = String(row[seasonIdx] || '').trim();
        const unitOfMeasure = String(row[unitIdx] || '').trim();
        const condition = conditionIdx >= 0 ? String(row[conditionIdx] || '').trim().toLowerCase() : null;
        const conditionNotes = conditionNotesIdx >= 0 ? String(row[conditionNotesIdx] || '').trim() : null;
        // Removed boxId extraction

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

        if (!initialStockStr || isNaN(parseInt(initialStockStr))) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            productCode,
            error: 'Initial Stock must be a valid number'
          });
          continue;
        }

        const initialStock = parseInt(initialStockStr);

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

        // Removed Box ID validation

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
          .select({ productCode: items.productCode })
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

        // Create the item with pending_approval status
        const [newItem] = await db.insert(items).values({
          productCode,
          description,
          brandCode: parsed.brandCode,
          productDivision: parsed.productDivision,
          productCategory: parsed.productCategory,
          period,
          season,
          unitOfMeasure: unitOfMeasure as 'PCS' | 'PRS',
          status: 'pending_approval',
          createdBy: currentUser.id,
        }).returning();

        // Create item stock record with initial stock in pending state (boxId set to null)
        const [newStock] = await db.insert(itemStock).values({
          itemId: newItem.productCode,
          pending: initialStock,
          inStorage: 0,
          onBorrow: 0,
          inClearance: 0,
          seeded: 0,
          boxId: null, // Explicitly set to null
          condition: (condition as 'excellent' | 'good' | 'fair' | 'poor') || 'good',
          conditionNotes: conditionNotes || null,
        }).returning();

        // Create item request for approval workflow
        await db.insert(itemRequests).values({
          itemId: newItem.productCode,
          requestedBy: currentUser.id,
          status: 'pending',
          notes: 'Item imported, awaiting approval from Storage Master',
        });

        // Record initial stock movement if initialStock > 0 (boxId set to null)
        if (initialStock > 0) {
          await db.insert(stockMovements).values({
            itemId: newItem.productCode,
            stockId: newStock.id,
            movementType: 'initial_stock',
            quantity: initialStock,
            fromState: 'none',
            toState: 'pending',
            boxId: null, // Explicitly set to null
            performedBy: currentUser.id,
            notes: 'Initial stock from import - pending approval',
          });
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          productCode: String(row[productCodeIdx] || '').trim(),
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
          currentField += '"';
          i += 2;
          continue;
        } else {
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
        inQuotes = true;
        i++;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i += 2;
      } else if (char === '\n' || char === '\r') {
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

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}
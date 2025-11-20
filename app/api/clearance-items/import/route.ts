// app/api/clearance-items/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, itemStock, stockMovements } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { users } from '@/lib/db/schema';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user
    if (!session.user.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 401 });
    }

    const currentUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    if (!['storage-master', 'storage-master-manager', 'superadmin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Parse the Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get the first row to check headers
    const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
    
    // Find the indices of our required columns
    const productCodeIndex = headers.findIndex(header => 
      header && header.toString().toLowerCase().includes('product code')
    );
    const inClearanceIndex = headers.findIndex(header => 
      header && header.toString().toLowerCase().includes('in clearance')
    );
    
    if (productCodeIndex === -1 || inClearanceIndex === -1) {
      return NextResponse.json({ 
        error: 'Invalid file format. Required columns: "Product Code" and "In Clearance" not found.' 
      }, { status: 400 });
    }
    
    // Convert to array of arrays for easier processing
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    // Skip header row
    const rows = data.slice(1);

    // Process each row
    const results = [];
    const errors = [];

    for (const [index, row] of rows.entries()) {
      try {
        // Get values using the column indices
        const productCode = row[productCodeIndex];
        const inClearanceValue = row[inClearanceIndex];
        
        // Validate required fields
        if (!productCode || inClearanceValue === undefined || inClearanceValue === null || inClearanceValue === '') {
          errors.push({
            row: index + 2, // +2 because Excel rows are 1-indexed and header is row 1
            error: 'Missing required fields: Product Code and In Clearance are required',
          });
          continue;
        }

        // Parse inClearance as integer
        const newClearance = parseInt(inClearanceValue);
        if (isNaN(newClearance) || newClearance < 0) {
          errors.push({
            row: index + 2,
            error: `Invalid In Clearance value: ${inClearanceValue}. Must be a non-negative number.`,
          });
          continue;
        }

        // Find the item
        const item = await db.query.items.findFirst({
          where: eq(items.productCode, productCode.toString().trim()),
        });

        if (!item) {
          errors.push({
            row: index + 2,
            error: `Item with product code ${productCode} not found`,
          });
          continue;
        }

        // Find the stock record
        const stockRecord = await db.query.itemStock.findFirst({
          where: eq(itemStock.itemId, item.productCode),
        });

        if (!stockRecord) {
          errors.push({
            row: index + 2,
            error: `Stock record for item ${productCode} not found`,
          });
          continue;
        }

        // Calculate the difference
        const currentClearance = stockRecord.inClearance;
        const difference = newClearance - currentClearance;

        // Update the stock record
        await db
          .update(itemStock)
          .set({
            inClearance: newClearance,
            inStorage: stockRecord.inStorage - difference, // Adjust storage accordingly
            updatedAt: new Date(),
          })
          .where(eq(itemStock.id, stockRecord.id));

        // Record the movement if there's a change
        if (difference !== 0) {
          await db.insert(stockMovements).values({
            itemId: item.productCode,
            stockId: stockRecord.id,
            movementType: 'adjustment',
            quantity: Math.abs(difference),
            fromState: difference > 0 ? 'storage' : 'clearance',
            toState: difference > 0 ? 'clearance' : 'storage',
            referenceId: 'import',
            referenceType: 'manual',
            performedBy: currentUser.id,
            notes: `Clearance import: ${difference > 0 ? 'Added to' : 'Removed from'} clearance`,
          });
        }

        results.push({
          row: index + 2,
          productCode: productCode,
          success: true,
          message: `Updated clearance quantity from ${currentClearance} to ${newClearance}`,
        });
      } catch (error) {
        console.error(`Error processing row ${index + 2}:`, error);
        errors.push({
          row: index + 2,
          error: `Unexpected error: ${error instanceof Error ? error.message : error}`,
        });
      }
    }

    return NextResponse.json({
      message: 'Import completed',
      results,
      errors,
      totalRows: rows.length,
      successCount: results.length,
      errorCount: errors.length,
    });
  } catch (error) {
    console.error('Failed to import clearance items:', error);
    return NextResponse.json(
      { error: 'Failed to import clearance items' },
      { status: 500 }
    );
  }
}
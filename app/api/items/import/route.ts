import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { parse } from 'csv-parse/sync';

// Define the type for CSV records
interface CsvRecord {
  'Product Code'?: string;
  'Description'?: string;
  'Brand Code'?: string;
  'Product Group'?: string;
  'Product Division'?: string;
  'Product Category'?: string;
  'Inventory'?: string;
  'Vendor'?: string;
  'Period'?: string;
  'Season'?: string;
  'Gender'?: string;
  'Mould'?: string;
  'Tier'?: string;
  'Silo'?: string;
  'Location'?: string;
  'Unit of Measure'?: string;
  'Condition'?: string;
  'Condition Notes'?: string;
}

// Define the type for import errors
interface ImportError {
  row: number;
  error: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can import items
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const csvFile = formData.get('csvFile') as File;
    
    if (!csvFile) {
      return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 });
    }

    // Read CSV file content
    const csvText = await csvFile.text();
    
    // Parse CSV with type assertion
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    }) as CsvRecord[];

    if (!records || records.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty or invalid' }, { status: 400 });
    }

    // Get user for createdBy
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Process each record
    const results = {
      success: 0,
      failed: 0,
      errors: [] as ImportError[] // Explicitly type the errors array
    };

    for (const [index, record] of records.entries()) {
      try {
        // Validate required fields
        if (!record['Product Code'] || !record['Description'] || !record['Brand Code']) {
          results.failed++;
          results.errors.push({
            row: index + 2, // +2 for header row
            error: 'Missing required fields: Product Code, Description, or Brand Code'
          });
          continue;
        }

        // Check if product code already exists
        const existingItem = await db
          .select()
          .from(items)
          .where(eq(items.productCode, record['Product Code']!));

        if (existingItem.length > 0) {
          results.failed++;
          results.errors.push({
            row: index + 2,
            error: `Product Code "${record['Product Code']}" already exists`
          });
          continue;
        }

        // Create the item with explicit field mapping
        await db.insert(items).values({
          productCode: record['Product Code']!,
          description: record['Description']!,
          brandCode: record['Brand Code']!,
          productGroup: record['Product Group'] || '',
          productDivision: record['Product Division'] || '',
          productCategory: record['Product Category'] || 'other',
          inventory: parseInt(record['Inventory'] || '0') || 0,
          vendor: record['Vendor'] || '',
          period: record['Period'] || '',
          season: record['Season'] || '',
          gender: record['Gender'] || '',
          mould: record['Mould'] || '',
          tier: record['Tier'] || '',
          silo: record['Silo'] || '',
          location: (record['Location'] as any) || 'Storage 1', // Type assertion for enum
          unitOfMeasure: (record['Unit of Measure'] as any) || 'PCS', // Type assertion for enum
          condition: (record['Condition'] as any) || 'good', // Type assertion for enum
          conditionNotes: record['Condition Notes'] || null,
          status: 'active' as any, // Type assertion for enum
          createdBy: session.user.id,
        });

        results.success++;
      } catch (error) {
        console.error(`Failed to import row ${index + 2}:`, error);
        results.failed++;
        results.errors.push({
          row: index + 2,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to import items:', error);
    return NextResponse.json(
      { error: 'Failed to import items' },
      { status: 500 }
    );
  }
}
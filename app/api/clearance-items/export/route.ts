// app/api/clearance-items/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, itemStock, boxes, locations, users } from '@/lib/db/schema';
import { eq, and, gt, or, ilike, SQL } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { parseProductCode } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('search') || '';
    const seasonFilter = searchParams.get('season') || 'all';
    const brandFilter = searchParams.get('brand') || 'all';
    const divisionFilter = searchParams.get('division') || 'all';
    const categoryFilter = searchParams.get('category') || 'all';
    const periodFilter = searchParams.get('period') || 'all';

    // Build conditions array with proper typing
    const conditions: SQL[] = [gt(itemStock.inClearance, 0)];
    
    // Add search condition if provided
    if (searchTerm) {
      const searchCondition = or(
        ilike(items.productCode, `%${searchTerm}%`),
        ilike(items.description, `%${searchTerm}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }
    
    // Add filter conditions if not 'all'
    if (seasonFilter !== 'all') {
      conditions.push(eq(items.season, seasonFilter));
    }
    
    if (brandFilter !== 'all') {
      conditions.push(eq(items.brandCode, brandFilter));
    }
    
    if (divisionFilter !== 'all') {
      conditions.push(eq(items.productDivision, divisionFilter));
    }
    
    if (categoryFilter !== 'all') {
      conditions.push(eq(items.productCategory, categoryFilter));
    }
    
    if (periodFilter !== 'all') {
      conditions.push(eq(items.period, periodFilter));
    }

    // Get all items with stock in clearance
    const clearanceItems = await db
      .select({
        productCode: items.productCode,
        description: items.description,
        brandCode: items.brandCode,
        productDivision: items.productDivision,
        productCategory: items.productCategory,
        season: items.season,
        period: items.period,
        unitOfMeasure: items.unitOfMeasure,
        status: items.status,
        createdAt: items.createdAt,
        createdByName: users.name,
        inClearance: itemStock.inClearance,
        boxNumber: boxes.boxNumber,
        locationName: locations.name,
        condition: itemStock.condition,
        conditionNotes: itemStock.conditionNotes,
      })
      .from(items)
      .leftJoin(itemStock, eq(items.productCode, itemStock.itemId))
      .leftJoin(boxes, eq(itemStock.boxId, boxes.id))
      .leftJoin(locations, eq(boxes.locationId, locations.id))
      .leftJoin(users, eq(items.createdBy, users.id))
      .where(and(...conditions))
      .execute();

    // Parse product codes to get brand, division, and category names
    const itemsWithParsedData = clearanceItems.map(item => {
      const parsed = parseProductCode(item.productCode);
      return {
        productCode: item.productCode,
        description: item.description,
        brandName: parsed.brandName,
        divisionName: parsed.divisionName,
        categoryName: parsed.categoryName,
        period: item.period,
        season: item.season,
        unitOfMeasure: item.unitOfMeasure,
        status: item.status,
        createdByName: item.createdByName,
        createdAt: item.createdAt,
        inClearance: item.inClearance,
        boxNumber: item.boxNumber,
        locationName: item.locationName,
        condition: item.condition,
        conditionNotes: item.conditionNotes,
      };
    });

    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Define headers for the export
    const headerColumns = [
      'Product Code',
      'Description',
      'Brand Name',
      'Division Name',
      'Category Name',
      'Period',
      'Season',
      'Unit of Measure',
      'Status',
      'In Clearance',
      'Box Number',
      'Location Name',
      'Condition',
      'Condition Notes',
      'Created By',
      'Created At'
    ];
    
    // Convert data to worksheet with proper headers
    const worksheetData = [headerColumns, ...itemsWithParsedData.map(item => [
      item.productCode,
      item.description,
      item.brandName,
      item.divisionName,
      item.categoryName,
      item.period,
      item.season,
      item.unitOfMeasure,
      item.status,
      item.inClearance,
      item.boxNumber || '',
      item.locationName || '',
      item.condition,
      item.conditionNotes || '',
      item.createdByName || '',
      new Date(item.createdAt).toISOString()
    ])];
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clearance Items');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers
    const responseHeaders = new Headers();
    responseHeaders.append('Content-Disposition', 'attachment; filename="clearance-items.xlsx"');
    responseHeaders.append('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    // Return the file
    return new NextResponse(buffer, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Failed to export clearance items:', error);
    return NextResponse.json(
      { error: 'Failed to export clearance items' },
      { status: 500 }
    );
  }
}
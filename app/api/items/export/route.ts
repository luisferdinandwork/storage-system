import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemArchives, users } from '@/lib/db/schema';
import { eq, or, and, isNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can export items
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'active'; // 'active', 'archived', or 'all'
    const format = searchParams.get('format') || 'csv'; // 'csv' or 'json'

    // Get items based on type
    let itemsQuery;
    if (type === 'active') {
      itemsQuery = db.select().from(items).where(eq(items.status, 'active'));
    } else if (type === 'archived') {
      itemsQuery = db.select().from(items).where(eq(items.status, 'archived'));
    } else {
      itemsQuery = db.select().from(items);
    }

    // Get items with their creators
    const itemsData = await itemsQuery
      .leftJoin(users, eq(items.createdBy, users.id))
      .orderBy(items.createdAt);

    // Format data for CSV
    const csvData = itemsData.map(item => ({
      'Product Code': item.items?.productCode || '',
      'Description': item.items?.description || '',
      'Brand Code': item.items?.brandCode || '',
      'Product Group': item.items?.productGroup || '',
      'Product Division': item.items?.productDivision || '',
      'Product Category': item.items?.productCategory || '',
      'Inventory': item.items?.inventory || 0,
      'Vendor': item.items?.vendor || '',
      'Period': item.items?.period || '',
      'Season': item.items?.season || '',
      'Gender': item.items?.gender || '',
      'Mould': item.items?.mould || '',
      'Tier': item.items?.tier || '',
      'Silo': item.items?.silo || '',
      'Location': item.items?.location || '',
      'Unit of Measure': item.items?.unitOfMeasure || '',
      'Condition': item.items?.condition || '',
      'Condition Notes': item.items?.conditionNotes || '',
      'Status': item.items?.status || '',
      'Created By': item.users?.name || 'Unknown',
      'Created At': item.items?.createdAt?.toISOString() || '',
      'Updated At': item.items?.updatedAt?.toISOString() || '',
    }));

    if (format === 'json') {
      // Format the data for JSON response
      const jsonData = itemsData.map(item => ({
        ...item.items,
        createdByUser: {
          id: item.users?.id,
          name: item.users?.name,
        },
      }));
      
      return NextResponse.json(jsonData);
    }

    // Generate CSV
    const csvHeaders = Object.keys(csvData[0] || {}).join(',');
    const csvRows = csvData.map(item => 
      Object.values(item).map(value => 
        typeof value === 'string' && value.includes(',') 
          ? `"${value.replace(/"/g, '""')}"` 
          : String(value)
      ).join(',')
    );

    const csvContent = [csvHeaders, ...csvRows].join('\n');

    // Set headers for CSV download
    const headers = new Headers();
    headers.append('Content-Type', 'text/csv');
    headers.append('Content-Disposition', `attachment; filename="items-${type}-${new Date().toISOString().split('T')[0]}.csv"`);

    return new NextResponse(csvContent, { headers });
  } catch (error) {
    console.error('Failed to export items:', error);
    return NextResponse.json(
      { error: 'Failed to export items' },
      { status: 500 }
    );
  }
}
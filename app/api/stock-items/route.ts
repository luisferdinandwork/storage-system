// app/api/stock-items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemStock, itemImages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/stock-items - List all items with stock information
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view stock items
    const allowedRoles = ['superadmin', 'storage-master'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const search = searchParams.get('search');

    // Build the query using Drizzle ORM
    const itemsWithStock = await db.query.items.findMany({
      with: {
        stock: true,
        images: true,
      },
      orderBy: [items.productCode],
    });

    // Filter results if needed
    let filteredItems = itemsWithStock;
    
    if (location) {
      filteredItems = filteredItems.filter(item => 
        item.stock && item.stock.location === location
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        item.productCode.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

    // Format the response
    const formattedItems = filteredItems.map((item) => ({
      id: item.id,
      productCode: item.productCode,
      description: item.description,
      brandCode: item.brandCode,
      productDivision: item.productDivision,
      productCategory: item.productCategory,
      totalStock: item.totalStock,
      period: item.period,
      season: item.season,
      unitOfMeasure: item.unitOfMeasure,
      status: item.status,
      images: item.images || [],
      stock: item.stock ? {
        id: item.stock.id,
        pending: item.stock.pending,
        inStorage: item.stock.inStorage,
        onBorrow: item.stock.onBorrow,
        inClearance: item.stock.inClearance,
        seeded: item.stock.seeded,
        location: item.stock.location,
        condition: item.stock.condition,
        conditionNotes: item.stock.conditionNotes,
      } : null,
    }));

    return NextResponse.json(formattedItems);
  } catch (error) {
    console.error('Failed to fetch stock items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock items' },
      { status: 500 }
    );
  }
}
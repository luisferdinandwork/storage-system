// app/api/stock-items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemStock, itemImages, boxes, locations } from '@/lib/db/schema';
import { eq, ilike, desc } from 'drizzle-orm';

// GET /api/stock-items - List all items with aggregated stock from all locations
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
    const boxId = searchParams.get('boxId');
    const locationId = searchParams.get('locationId');
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    // First, get all items with basic info
    let itemsQuery = db
      .select({
        productCode: items.productCode,
        description: items.description,
        brandCode: items.brandCode,
        productDivision: items.productDivision,
        productCategory: items.productCategory,
        period: items.period,
        season: items.season,
        unitOfMeasure: items.unitOfMeasure,
        status: items.status,
        createdBy: items.createdBy,
        createdAt: items.createdAt,
        updatedAt: items.updatedAt,
        approvedBy: items.approvedBy,
        approvedAt: items.approvedAt,
      })
      .from(items)
      .orderBy(desc(items.updatedAt));

    // Apply status filter if specified
    let itemsData;
    if (status) {
      itemsData = await itemsQuery.where(eq(items.status, status as any));
    } else {
      itemsData = await itemsQuery;
    }

    // Fetch all images
    const allImages = await db
      .select()
      .from(itemImages);

    // Group images by itemId (productCode)
    const imagesByItemId: Record<string, any[]> = {};
    for (const image of allImages) {
      if (!imagesByItemId[image.itemId]) {
        imagesByItemId[image.itemId] = [];
      }
      imagesByItemId[image.itemId].push(image);
    }

    // For each item, aggregate stock from all locations
    const itemsWithAggregatedStock = await Promise.all(
      itemsData.map(async (item) => {
        // Get all stock records for this item
        const stockRecords = await db
          .select({
            stock: itemStock,
            box: boxes,
            location: locations,
          })
          .from(itemStock)
          .leftJoin(boxes, eq(itemStock.boxId, boxes.id))
          .leftJoin(locations, eq(boxes.locationId, locations.id))
          .where(eq(itemStock.itemId, item.productCode));

        // Aggregate quantities across all locations
        const aggregatedStock = stockRecords.reduce(
          (totals, record) => ({
            pending: totals.pending + record.stock.pending,
            inStorage: totals.inStorage + record.stock.inStorage,
            onBorrow: totals.onBorrow + record.stock.onBorrow,
            inClearance: totals.inClearance + record.stock.inClearance,
            seeded: totals.seeded + record.stock.seeded,
          }),
          { pending: 0, inStorage: 0, onBorrow: 0, inClearance: 0, seeded: 0 }
        );

        // Calculate total stock
        const totalStock = 
          aggregatedStock.pending + 
          aggregatedStock.inStorage + 
          aggregatedStock.onBorrow + 
          aggregatedStock.inClearance + 
          aggregatedStock.seeded;

        return {
          ...item,
          stock: aggregatedStock, // Aggregated stock quantities
          stockRecords: stockRecords.map(r => ({
            ...r.stock,
            box: r.box,
            location: r.location,
          })), // Individual stock records with location details
          totalStock,
          images: imagesByItemId[item.productCode] || [],
        };
      })
    );

    // Filter results if needed
    let filteredItems = itemsWithAggregatedStock;
    
    if (boxId) {
      filteredItems = filteredItems.filter(item => 
        item.stockRecords.some((record: any) => 
          record.box && record.box.id === boxId
        )
      );
    }
    
    if (locationId) {
      filteredItems = filteredItems.filter(item => 
        item.stockRecords.some((record: any) => 
          record.location && record.location.id === locationId
        )
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        item.productCode.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json(filteredItems);
  } catch (error) {
    console.error('Failed to fetch stock items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock items', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
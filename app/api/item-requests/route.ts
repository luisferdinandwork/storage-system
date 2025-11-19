// app/api/item-requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { itemRequests, items, users, itemImages, itemStock, boxes, locations } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

// GET /api/item-requests - List all item requests with aggregated stock from all locations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // First, get all item requests with basic item info
    const requests = await db.query.itemRequests.findMany({
      with: {
        item: {
          with: {
            images: true,
            createdBy: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
        requestedBy: {
          columns: {
            id: true,
            name: true,
            role: true,
          },
        },
        approvedBy: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [desc(itemRequests.requestedAt)],
    });

    // Filter by status if provided
    const filteredRequests = status 
      ? requests.filter(req => req.status === status)
      : requests;

    // Collect all unique item IDs
    const itemIds = [...new Set(filteredRequests.map(req => req.itemId))];
    
    // Fetch all stock records for these items with location details
    const allStockRecords = await db
      .select({
        stock: itemStock,
        box: boxes,
        location: locations,
      })
      .from(itemStock)
      .leftJoin(boxes, eq(itemStock.boxId, boxes.id))
      .leftJoin(locations, eq(boxes.locationId, locations.id))
      .where(inArray(itemStock.itemId, itemIds));

    // Group stock records by item ID and aggregate quantities
    const stockByItemId: Record<string, {
      aggregated: {
        pending: number;
        inStorage: number;
        onBorrow: number;
        inClearance: number;
        seeded: number;
      };
      records: Array<{
        id: string;
        itemId: string;
        pending: number;
        inStorage: number;
        onBorrow: number;
        inClearance: number;
        seeded: number;
        boxId: string | null;
        box?: {
          id: string;
          boxNumber: string;
          description: string | null;
          location: {
            id: string;
            name: string;
          } | null;
        } | null;
        location?: {
          id: string;
          name: string;
        } | null;
        condition: string;
        conditionNotes: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
    }> = {};

    // Process stock records
    for (const record of allStockRecords) {
      const itemId = record.stock.itemId;
      
      if (!stockByItemId[itemId]) {
        stockByItemId[itemId] = {
          aggregated: {
            pending: 0,
            inStorage: 0,
            onBorrow: 0,
            inClearance: 0,
            seeded: 0,
          },
          records: [],
        };
      }

      // Add to aggregated quantities
      stockByItemId[itemId].aggregated.pending += record.stock.pending;
      stockByItemId[itemId].aggregated.inStorage += record.stock.inStorage;
      stockByItemId[itemId].aggregated.onBorrow += record.stock.onBorrow;
      stockByItemId[itemId].aggregated.inClearance += record.stock.inClearance;
      stockByItemId[itemId].aggregated.seeded += record.stock.seeded;

      // Add to records array with location details
      stockByItemId[itemId].records.push({
        ...record.stock,
        createdAt: record.stock.createdAt.toISOString(),
        updatedAt: record.stock.updatedAt.toISOString(),
        box: record.box ? {
          id: record.box.id,
          boxNumber: record.box.boxNumber,
          description: record.box.description,
          location: record.location ? {
            id: record.location.id,
            name: record.location.name,
          } : null, // Allow null for location within box
        } : null,
        location: record.location ? {
          id: record.location.id,
          name: record.location.name,
        } : null,
      });
    }

    // Format the response with aggregated stock data
    const formattedRequests = filteredRequests.map((request) => {
      const itemStockData = stockByItemId[request.itemId] || {
        aggregated: {
          pending: 0,
          inStorage: 0,
          onBorrow: 0,
          inClearance: 0,
          seeded: 0,
        },
        records: [],
      };

      const totalStock = 
        itemStockData.aggregated.pending + 
        itemStockData.aggregated.inStorage + 
        itemStockData.aggregated.onBorrow + 
        itemStockData.aggregated.inClearance + 
        itemStockData.aggregated.seeded;

      return {
        id: request.id,
        itemId: request.itemId,
        requestedBy: request.requestedBy,
        requestedAt: request.requestedAt,
        status: request.status,
        approvedBy: request.approvedBy,
        approvedAt: request.approvedAt,
        rejectionReason: request.rejectionReason,
        notes: request.notes,
        item: {
          ...request.item,
          totalStock,
          stock: itemStockData.aggregated,
          stockRecords: itemStockData.records,
          images: request.item.images || [],
        },
        requestedByUser: request.requestedBy || {
          id: request.requestedBy,
          name: 'Unknown',
          role: 'unknown',
        },
        approvedByUser: request.approvedBy || null,
      };
    });

    return NextResponse.json(formattedRequests);
  } catch (error) {
    console.error('Failed to fetch item requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item requests' },
      { status: 500 }
    );
  }
}
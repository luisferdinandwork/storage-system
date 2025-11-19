// app/api/items/clearance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemStock, itemClearances, users, boxes, locations } from '@/lib/db/schema';
import { eq, and, isNotNull, gt, sql, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get items with stock in clearance
    const clearanceItems = await db
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
        createdByUser: {
          id: users.id,
          name: users.name,
        },
        stock: {
          id: itemStock.id,
          itemId: itemStock.itemId,
          pending: itemStock.pending,
          inStorage: itemStock.inStorage,
          onBorrow: itemStock.onBorrow,
          inClearance: itemStock.inClearance,
          seeded: itemStock.seeded,
          boxId: itemStock.boxId,
          condition: itemStock.condition,
          conditionNotes: itemStock.conditionNotes,
          createdAt: itemStock.createdAt,
          updatedAt: itemStock.updatedAt,
        },
      })
      .from(items)
      .leftJoin(users, eq(items.createdBy, users.id))
      .leftJoin(itemStock, eq(items.productCode, itemStock.itemId))
      .where(and(
        isNotNull(itemStock.inClearance),
        gt(itemStock.inClearance, 0)
      ))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .leftJoin(itemStock, eq(items.productCode, itemStock.itemId))
      .where(and(
        isNotNull(itemStock.inClearance),
        gt(itemStock.inClearance, 0)
      ));

    const count = countResult[0]?.count || 0;

    // Get clearance details and location info for each item
    const itemsWithClearance = await Promise.all(
      (clearanceItems || []).map(async (item) => {
        // Get the latest clearance record
        const clearance = await db
          .select({
            id: itemClearances.id,
            itemId: itemClearances.itemId,
            quantity: itemClearances.quantity,
            requestedBy: itemClearances.requestedBy,
            requestedAt: itemClearances.requestedAt,
            reason: itemClearances.reason,
            status: itemClearances.status,
            approvedBy: itemClearances.approvedBy,
            approvedAt: itemClearances.approvedAt,
            rejectionReason: itemClearances.rejectionReason,
            clearedAt: itemClearances.clearedAt,
            metadata: itemClearances.metadata,
          })
          .from(itemClearances)
          .where(eq(itemClearances.itemId, item.productCode))
          .orderBy(desc(itemClearances.requestedAt))
          .limit(1);

        // Get location information if boxId exists
        let locationInfo = null;
        if (item.stock?.boxId) {
          locationInfo = await db.query.boxes.findFirst({
            where: eq(boxes.id, item.stock.boxId),
            with: {
              location: true
            }
          });
        }

        return {
          ...item,
          clearances: clearance,
          location: locationInfo ? {
            id: locationInfo.location.id,
            name: locationInfo.location.name,
            boxId: locationInfo.id,
            boxNumber: locationInfo.boxNumber,
          } : null,
        };
      })
    );

    return NextResponse.json({
      items: itemsWithClearance || [],
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch clearance items:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch clearance items',
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        }
      },
      { status: 500 }
    );
  }
}
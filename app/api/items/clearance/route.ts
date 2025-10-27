// app/api/items/clearance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemStock, itemClearances, users } from '@/lib/db/schema';
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
        id: items.id,
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
          location: itemStock.location,
          condition: itemStock.condition,
          conditionNotes: itemStock.conditionNotes,
          createdAt: itemStock.createdAt,
          updatedAt: itemStock.updatedAt,
        },
      })
      .from(items)
      .leftJoin(users, eq(items.createdBy, users.id))
      .leftJoin(itemStock, eq(items.id, itemStock.itemId))
      .where(and(
        isNotNull(itemStock.inClearance),
        gt(itemStock.inClearance, 0) // Only show items with inClearance > 0
      ))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .leftJoin(itemStock, eq(items.id, itemStock.itemId))
      .where(and(
        isNotNull(itemStock.inClearance),
        gt(itemStock.inClearance, 0)
      ));

    // Get clearance details for each item
    const itemsWithClearance = await Promise.all(
      clearanceItems.map(async (item) => {
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
          .where(eq(itemClearances.itemId, item.id))
          .orderBy(desc(itemClearances.requestedAt)) // Fixed: use desc() function
          .limit(1);

        return {
          ...item,
          clearances: clearance,
        };
      })
    );

    return NextResponse.json({
      items: itemsWithClearance,
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
      { error: 'Failed to fetch clearance items' },
      { status: 500 }
    );
  }
}
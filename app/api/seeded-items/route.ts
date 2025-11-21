import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { itemStock, items, stockMovements, boxes, locations, users } from '@/lib/db/schema';
import { eq, and, gte, desc, or, ilike, SQL } from 'drizzle-orm';

// Helper function to determine the worse condition
function getWorseCondition(
  condition1: 'excellent' | 'good' | 'fair' | 'poor',
  condition2: 'excellent' | 'good' | 'fair' | 'poor'
): 'excellent' | 'good' | 'fair' | 'poor' {
  const conditionOrder = { excellent: 4, good: 3, fair: 2, poor: 1 };
  return conditionOrder[condition1] < conditionOrder[condition2] ? condition1 : condition2;
}

// Helper function to check if a stock record should be deleted
function shouldDeleteStockRecord(stock: {
  pending: number;
  inStorage: number;
  onBorrow: number;
  inClearance: number;
  seeded: number;
}): boolean {
  return (
    stock.pending === 0 &&
    stock.inStorage === 0 &&
    stock.onBorrow === 0 &&
    stock.inClearance === 0 &&
    stock.seeded === 0
  );
}

// GET /api/seeded-items - List all seeded items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view seeded items
    const allowedRoles = ['superadmin', 'storage-master', 'storage-master-manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const locationId = searchParams.get('locationId');
    const boxId = searchParams.get('boxId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build conditions array
    const conditions = [gte(itemStock.seeded, 1)];
    
    // Add search condition if provided
    if (search) {
    conditions.push(
        or(
        ilike(items.description, `%${search}%`),
        ilike(items.productCode, `%${search}%`),
        ilike(boxes.boxNumber, `%${search}%`)
        ) as SQL<unknown>
    );
    }

    // Add location filter if provided
    if (locationId) {
      conditions.push(eq(locations.id, locationId));
    }

    // Add box filter if provided
    if (boxId) {
      conditions.push(eq(boxes.id, boxId));
    }

    // Build the query with all conditions
    const query = db
      .select({
        stock: itemStock,
        item: {
          productCode: items.productCode,
          description: items.description,
          brandCode: items.brandCode,
          period: items.period,
          season: items.season,
          unitOfMeasure: items.unitOfMeasure,
        },
        box: {
          id: boxes.id,
          boxNumber: boxes.boxNumber,
          description: boxes.description,
        },
        location: {
          id: locations.id,
          name: locations.name,
        },
      })
      .from(itemStock)
      .leftJoin(items, eq(itemStock.itemId, items.productCode))
      .leftJoin(boxes, eq(itemStock.boxId, boxes.id))
      .leftJoin(locations, eq(boxes.locationId, locations.id));

    // Apply conditions if any exist
    if (conditions.length > 1) {
      query.where(and(...conditions));
    } else {
      query.where(conditions[0]);
    }

    const seededItems = await query
      .orderBy(desc(itemStock.updatedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(seededItems);
  } catch (error) {
    console.error('Failed to fetch seeded items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seeded items', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/seeded-items/return - Return seeded items to storage
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage seeded items
    const allowedRoles = ['superadmin', 'storage-master', 'storage-master-manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { items: itemsReturning } = body;

    if (!itemsReturning || !Array.isArray(itemsReturning) || itemsReturning.length === 0) {
      return NextResponse.json({ 
        error: 'Items return data is required' 
      }, { status: 400 });
    }

    // Validate each item return entry
    for (const item of itemsReturning) {
      if (!item.stockId || !item.boxId || !item.quantity || !item.condition) {
        return NextResponse.json({ 
          error: 'Each item must have stockId, boxId, quantity, and condition' 
        }, { status: 400 });
      }

      if (!['excellent', 'good', 'fair', 'poor'].includes(item.condition)) {
        return NextResponse.json({ 
          error: 'Condition must be one of: excellent, good, fair, poor' 
        }, { status: 400 });
      }

      if (item.quantity <= 0) {
        return NextResponse.json({ 
          error: 'Quantity must be greater than 0' 
        }, { status: 400 });
      }
    }

    const results = [];
    const now = new Date();

    // Process each item
    for (const itemReturning of itemsReturning) {
      try {
        // Get the seeded stock record
        const [seededStock] = await db
          .select()
          .from(itemStock)
          .where(eq(itemStock.id, itemReturning.stockId));

        if (!seededStock || seededStock.seeded <= 0) {
          results.push({
            stockId: itemReturning.stockId,
            success: false,
            error: 'Invalid stock ID or no seeded items'
          });
          continue;
        }

        if (seededStock.seeded < itemReturning.quantity) {
          results.push({
            stockId: itemReturning.stockId,
            success: false,
            error: `Insufficient seeded quantity. Available: ${seededStock.seeded}, Requested: ${itemReturning.quantity}`
          });
          continue;
        }

        // Validate boxId
        const box = await db.query.boxes.findFirst({
          where: eq(boxes.id, itemReturning.boxId)
        });
        
        if (!box) {
          results.push({
            stockId: itemReturning.stockId,
            success: false,
            error: `Box with ID ${itemReturning.boxId} not found`
          });
          continue;
        }

        // Get all stock records for this item
        const stockRecords = await db.query.itemStock.findMany({
          where: eq(itemStock.itemId, seededStock.itemId),
        });

        // Check if there's already a stock record for the target box
        const targetBoxStock = stockRecords.find(s => s.boxId === itemReturning.boxId);

        if (targetBoxStock) {
          // Target box already has stock - merge into it
          await db.update(itemStock)
            .set({
              inStorage: targetBoxStock.inStorage + itemReturning.quantity,
              condition: getWorseCondition(targetBoxStock.condition, itemReturning.condition),
              conditionNotes: itemReturning.notes 
                ? `${targetBoxStock.conditionNotes || ''}\n[${now.toISOString()}] ${itemReturning.notes}`.trim()
                : targetBoxStock.conditionNotes,
              updatedAt: now,
            })
            .where(eq(itemStock.id, targetBoxStock.id));

          // Create stock movement record
          await db.insert(stockMovements).values({
            itemId: seededStock.itemId,
            stockId: targetBoxStock.id,
            movementType: 'revert_seed',
            quantity: itemReturning.quantity,
            fromState: 'seeded',
            toState: 'storage',
            referenceType: 'manual',
            boxId: itemReturning.boxId,
            performedBy: session.user.id,
            notes: itemReturning.notes || `Returned ${itemReturning.quantity} units from seeded to storage in ${itemReturning.condition} condition`,
            createdAt: now,
          });

        } else {
          // No stock exists for target box - create new one
          const [newStock] = await db.insert(itemStock).values({
            itemId: seededStock.itemId,
            pending: 0,
            inStorage: itemReturning.quantity,
            onBorrow: 0,
            inClearance: 0,
            seeded: 0,
            boxId: itemReturning.boxId,
            condition: itemReturning.condition,
            conditionNotes: itemReturning.notes || null,
            createdAt: now,
            updatedAt: now,
          }).returning();

          // Create stock movement record
          await db.insert(stockMovements).values({
            itemId: seededStock.itemId,
            stockId: newStock.id,
            movementType: 'revert_seed',
            quantity: itemReturning.quantity,
            fromState: 'seeded',
            toState: 'storage',
            referenceType: 'manual',
            boxId: itemReturning.boxId,
            performedBy: session.user.id,
            notes: itemReturning.notes || `Returned ${itemReturning.quantity} units from seeded to new storage in ${itemReturning.condition} condition`,
            createdAt: now,
          });
        }

        // Update seeded stock (reduce seeded quantity)
        const newSeeded = Math.max(0, seededStock.seeded - itemReturning.quantity);
        await db.update(itemStock)
          .set({
            seeded: newSeeded,
            updatedAt: now,
          })
          .where(eq(itemStock.id, seededStock.id));

        // Delete seeded stock record if empty
        if (shouldDeleteStockRecord({
          ...seededStock,
          seeded: newSeeded
        })) {
          await db.delete(itemStock)
            .where(eq(itemStock.id, seededStock.id));
          
          console.log(`Deleted empty seeded stock record ${seededStock.id}`);
        }

        results.push({
          stockId: itemReturning.stockId,
          success: true,
          message: `Successfully returned ${itemReturning.quantity} units to storage`
        });
      } catch (error) {
        console.error(`Failed to return stock ${itemReturning.stockId}:`, error);
        results.push({
          stockId: itemReturning.stockId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: 'Processed return requests',
      results
    });
  } catch (error) {
    console.error('Failed to return seeded items:', error);
    return NextResponse.json(
      { error: 'Failed to return seeded items', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/seeded-items - Delete seeded items
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage seeded items
    const allowedRoles = ['superadmin', 'storage-master', 'storage-master-manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { stockIds, notes } = body;

    if (!stockIds || !Array.isArray(stockIds) || stockIds.length === 0) {
      return NextResponse.json({ 
        error: 'Stock IDs are required and must be an array' 
      }, { status: 400 });
    }

    const results = [];

    // Process each stock ID
    for (const stockId of stockIds) {
      try {
        // Get the stock record
        const [stock] = await db
          .select()
          .from(itemStock)
          .where(eq(itemStock.id, stockId));

        if (!stock || stock.seeded <= 0) {
          results.push({
            stockId,
            success: false,
            error: 'Invalid stock ID or no seeded items'
          });
          continue;
        }

        // Update the stock record
        await db
          .update(itemStock)
          .set({
            seeded: 0,
            updatedAt: new Date(),
          })
          .where(eq(itemStock.id, stockId));

        // Create stock movement record
        await db
          .insert(stockMovements)
          .values({
            itemId: stock.itemId,
            stockId: stock.id,
            movementType: 'clearance',
            quantity: stock.seeded,
            fromState: 'seeded',
            toState: 'none',
            referenceType: 'manual',
            boxId: stock.boxId,
            performedBy: session.user.id,
            notes: notes || `Deleted ${stock.seeded} seeded units`,
          });

        results.push({
          stockId,
          success: true,
          message: `Successfully deleted ${stock.seeded} seeded units`
        });
      } catch (error) {
        console.error(`Failed to delete stock ${stockId}:`, error);
        results.push({
          stockId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: 'Processed deletion requests',
      results
    });
  } catch (error) {
    console.error('Failed to delete seeded items:', error);
    return NextResponse.json(
      { error: 'Failed to delete seeded items', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
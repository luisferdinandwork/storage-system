// app/api/item-movements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemStock, stockMovements, boxes } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create item movements
    const allowedRoles = ['superadmin', 'storage-master', 'storage-manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { itemId, sourceStockId, destinationBoxId, quantity, notes } = body;

    // Validate required fields
    if (!itemId || !sourceStockId || !destinationBoxId || !quantity || quantity <= 0) {
      return NextResponse.json({ 
        error: 'Missing required fields or invalid quantity' 
      }, { status: 400 });
    }

    // Get the source stock record
    const [sourceStock] = await db
      .select({
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
      })
      .from(itemStock)
      .where(eq(itemStock.id, sourceStockId));

    if (!sourceStock) {
      return NextResponse.json({ error: 'Source stock not found' }, { status: 404 });
    }

    // Check if there's enough stock to move
    if (sourceStock.inStorage < quantity) {
      return NextResponse.json({ 
        error: 'Insufficient stock available for movement' 
      }, { status: 400 });
    }

    // Get the destination box and location
    const [destinationBox] = await db
      .select({
        id: boxes.id,
        locationId: boxes.locationId,
      })
      .from(boxes)
      .where(eq(boxes.id, destinationBoxId));

    if (!destinationBox) {
      return NextResponse.json({ error: 'Destination box not found' }, { status: 404 });
    }

    // Check if source and destination are the same
    if (sourceStock.boxId === destinationBoxId) {
      return NextResponse.json({ 
        error: 'Source and destination cannot be the same' 
      }, { status: 400 });
    }

    // Get the item details
    const [item] = await db
      .select()
      .from(items)
      .where(eq(items.productCode, itemId));

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check if there's already a stock record for this item in the destination box
    const [destinationStock] = await db
      .select()
      .from(itemStock)
      .where(and(
        eq(itemStock.itemId, itemId),
        eq(itemStock.boxId, destinationBoxId)
      ));

    // Perform operations sequentially (no transaction)
    try {
      // 1. Update source stock (decrease quantity)
      const newInStorage = sourceStock.inStorage - quantity;
      await db
        .update(itemStock)
        .set({
          inStorage: newInStorage,
          updatedAt: new Date(),
        })
        .where(eq(itemStock.id, sourceStockId));

      // 2. Create stock movement record BEFORE deleting the stock record
      const [movement] = await db
        .insert(stockMovements)
        .values({
          itemId,
          stockId: sourceStockId, // This still exists at this point
          movementType: 'adjustment',
          quantity,
          fromState: 'storage',
          toState: 'storage',
          referenceType: 'manual',
          boxId: destinationBoxId,
          performedBy: session.user.id,
          notes: notes || `Moved ${quantity} units from box ${sourceStock.boxId} to box ${destinationBoxId}`,
        })
        .returning();

      // 3. Check if source stock should be deleted after update
      const updatedSourceStock = {
        ...sourceStock,
        inStorage: newInStorage
      };
      
      if (shouldDeleteStockRecord(updatedSourceStock)) {
        await db.delete(itemStock).where(eq(itemStock.id, sourceStockId));
        console.log(`Deleted empty stock record ${sourceStockId} after movement`);
      }

      // 4. Update or create destination stock (increase quantity)
      if (destinationStock) {
        await db
          .update(itemStock)
          .set({
            inStorage: destinationStock.inStorage + quantity,
            updatedAt: new Date(),
          })
          .where(eq(itemStock.id, destinationStock.id));
      } else {
        await db
          .insert(itemStock)
          .values({
            itemId,
            pending: 0,
            inStorage: quantity,
            onBorrow: 0,
            inClearance: 0,
            seeded: 0,
            boxId: destinationBoxId,
            condition: sourceStock.condition,
            conditionNotes: sourceStock.conditionNotes,
          });
      }

      return NextResponse.json({ 
        message: 'Item movement created successfully',
        movement 
      });
    } catch (updateError) {
      console.error('Error during stock update:', updateError);
      
      // Since we don't have transactions, we can't automatically rollback
      // You might want to implement manual rollback logic here or log the error for manual intervention
      return NextResponse.json(
        { 
          error: 'Failed to complete item movement. Please check stock consistency.',
          details: updateError instanceof Error ? updateError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to create item movement:', error);
    return NextResponse.json(
      { error: 'Failed to create item movement', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint remains the same
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view item movements
    const allowedRoles = ['superadmin', 'storage-master', 'storage-manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build the base query
    let query = db
      .select({
        id: stockMovements.id,
        itemId: stockMovements.itemId,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        fromState: stockMovements.fromState,
        toState: stockMovements.toState,
        referenceType: stockMovements.referenceType,
        notes: stockMovements.notes,
        createdAt: stockMovements.createdAt,
        performedBy: stockMovements.performedBy,
      })
      .from(stockMovements)
      .orderBy(desc(stockMovements.createdAt));

    // Apply filters if needed
    let movements;
    if (itemId) {
      movements = await query
        .where(and(
          eq(stockMovements.itemId, itemId),
          eq(stockMovements.movementType, 'adjustment')
        ))
        .limit(limit)
        .offset(offset);
    } else {
      movements = await query
        .where(eq(stockMovements.movementType, 'adjustment'))
        .limit(limit)
        .offset(offset);
    }

    return NextResponse.json(movements);
  } catch (error) {
    console.error('Failed to fetch item movements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item movements', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
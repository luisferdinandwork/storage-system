// app/api/item-movements/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemStock, stockMovements, boxes } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

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
    const { movements, destinationBoxId, notes } = body;

    // Validate required fields
    if (!movements || !Array.isArray(movements) || movements.length === 0 || !destinationBoxId) {
      return NextResponse.json({ 
        error: 'Missing required fields or invalid movements data' 
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

    // Get all source stock records - SELECT ALL FIELDS
    const sourceStockIds = movements.map(m => m.sourceStockId);
    const sourceStocks = await db
      .select()
      .from(itemStock)
      .where(inArray(itemStock.id, sourceStockIds));

    if (sourceStocks.length !== sourceStockIds.length) {
      return NextResponse.json({ error: 'One or more source stock records not found' }, { status: 404 });
    }

    // Verify itemIds match
    const itemIdMismatches = movements.filter(movement => {
      const stock = sourceStocks.find(s => s.id === movement.sourceStockId);
      return stock && stock.itemId !== movement.itemId;
    });

    if (itemIdMismatches.length > 0) {
      return NextResponse.json({ 
        error: 'Item ID mismatch with source stock for one or more items' 
      }, { status: 400 });
    }

    // Get item details for all items
    const itemIds = sourceStocks.map(s => s.itemId);
    const itemsData = await db
      .select()
      .from(items)
      .where(inArray(items.productCode, itemIds));

    if (itemsData.length !== itemIds.length) {
      return NextResponse.json({ error: 'One or more items not found' }, { status: 404 });
    }

    // Check if any source and destination are the same
    const sameSourceDest = sourceStocks.some(stock => stock.boxId === destinationBoxId);
    if (sameSourceDest) {
      return NextResponse.json({ 
        error: 'Source and destination cannot be the same for one or more items' 
      }, { status: 400 });
    }

    // Check if there's enough stock to move for each item
    const insufficientStockItems = movements.filter(movement => {
      const stock = sourceStocks.find(s => s.id === movement.sourceStockId);
      return stock && stock.inStorage < movement.quantity;
    });

    if (insufficientStockItems.length > 0) {
      const details = insufficientStockItems.map(m => {
        const stock = sourceStocks.find(s => s.id === m.sourceStockId);
        return `${m.itemId}: Available ${stock?.inStorage}, Requested ${m.quantity}`;
      }).join('; ');
      
      return NextResponse.json({ 
        error: `Insufficient stock available for one or more items: ${details}` 
      }, { status: 400 });
    }

    // Get existing stock records for destination box
    const destinationStocks = await db
      .select()
      .from(itemStock)
      .where(and(
        inArray(itemStock.itemId, itemIds),
        eq(itemStock.boxId, destinationBoxId)
      ));

    // Perform operations for each movement
    const results = [];
    const errors = [];

    for (const movement of movements) {
      try {
        const sourceStock = sourceStocks.find(s => s.id === movement.sourceStockId);
        if (!sourceStock) {
          errors.push({
            itemId: movement.itemId,
            error: 'Source stock not found'
          });
          continue;
        }

        // 1. Update source stock (decrease quantity)
        const newInStorage = sourceStock.inStorage - movement.quantity;
        await db
          .update(itemStock)
          .set({
            inStorage: newInStorage,
            updatedAt: new Date(),
          })
          .where(eq(itemStock.id, sourceStock.id));

        // 2. Create stock movement record
        const [movementRecord] = await db
          .insert(stockMovements)
          .values({
            itemId: sourceStock.itemId,
            stockId: sourceStock.id,
            movementType: 'adjustment',
            quantity: movement.quantity,
            fromState: 'storage',
            toState: 'storage',
            referenceType: 'manual',
            boxId: destinationBoxId,
            performedBy: session.user.id,
            notes: notes || `Bulk move: ${movement.quantity} units from box ${sourceStock.boxId} to box ${destinationBoxId}`,
          })
          .returning();

        // 3. Check if source stock should be deleted after update
        const updatedSourceStock = {
          pending: sourceStock.pending,
          inStorage: newInStorage,
          onBorrow: sourceStock.onBorrow,
          inClearance: sourceStock.inClearance,
          seeded: sourceStock.seeded
        };
        
        if (shouldDeleteStockRecord(updatedSourceStock)) {
          await db.delete(itemStock).where(eq(itemStock.id, sourceStock.id));
          console.log(`Deleted empty stock record ${sourceStock.id} after movement`);
        }

        // 4. Update or create destination stock (increase quantity)
        const destinationStock = destinationStocks.find(s => s.itemId === sourceStock.itemId);
        if (destinationStock) {
          await db
            .update(itemStock)
            .set({
              inStorage: destinationStock.inStorage + movement.quantity,
              updatedAt: new Date(),
            })
            .where(eq(itemStock.id, destinationStock.id));
        } else {
          await db
            .insert(itemStock)
            .values({
              itemId: sourceStock.itemId,
              pending: 0,
              inStorage: movement.quantity,
              onBorrow: 0,
              inClearance: 0,
              seeded: 0,
              boxId: destinationBoxId,
              condition: sourceStock.condition || 'good',
              conditionNotes: sourceStock.conditionNotes || null,
            });
        }

        results.push({
          itemId: sourceStock.itemId,
          movementId: movementRecord.id,
          quantity: movement.quantity,
          success: true
        });
      } catch (error) {
        console.error(`Error moving item ${movement.itemId}:`, error);
        errors.push({
          itemId: movement.itemId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ 
        message: 'Bulk movement completed with errors',
        successCount: results.length,
        errorCount: errors.length,
        results,
        errors 
      }, { status: 207 }); // 207 Multi-Status
    }

    return NextResponse.json({ 
      message: 'Bulk item movement completed successfully',
      count: results.length,
      results 
    });
  } catch (error) {
    console.error('Failed to create bulk item movement:', error);
    return NextResponse.json(
      { error: 'Failed to create bulk item movement', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
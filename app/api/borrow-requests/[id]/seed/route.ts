import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { borrowRequests, borrowRequestItems, itemStock, stockMovements, boxes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isStorageMaster = session.user.role === 'storage-master' || session.user.role === 'storage-master-manager';
    const isSuperAdmin = session.user.role === 'superadmin';

    if (!isStorageMaster && !isSuperAdmin) {
      return NextResponse.json({ 
        error: 'Only storage masters can mark items as seeded' 
      }, { status: 403 });
    }

    const { id: borrowRequestId } = await params;
    const body = await request.json();
    const { items: itemsSeeding } = body;

    if (!itemsSeeding || !Array.isArray(itemsSeeding) || itemsSeeding.length === 0) {
      return NextResponse.json({ 
        error: 'Items seeding data is required' 
      }, { status: 400 });
    }

    // Validate each item seeding entry
    for (const item of itemsSeeding) {
      if (!item.borrowRequestItemId || !item.status) {
        return NextResponse.json({ 
          error: 'Each item must have borrowRequestItemId and status' 
        }, { status: 400 });
      }

      if (item.status !== 'seeded') {
        return NextResponse.json({ 
          error: 'Status must be "seeded"' 
        }, { status: 400 });
      }

      if (!item.reason || item.reason.trim() === '') {
        return NextResponse.json({ 
          error: 'Reason is required for seeded items' 
        }, { status: 400 });
      }
    }

    // Get the borrow request and its items
    const borrowRequest = await db.query.borrowRequests.findFirst({
      where: eq(borrowRequests.id, borrowRequestId),
      with: {
        items: true,
      },
    });

    if (!borrowRequest) {
      return NextResponse.json({ error: 'Borrow request not found' }, { status: 404 });
    }

    if (borrowRequest.status !== 'active') {
      return NextResponse.json({ 
        error: 'Only active borrow requests can be marked as seeded' 
      }, { status: 400 });
    }

    const now = new Date();

    // Update each borrow request item
    for (const itemSeeding of itemsSeeding) {
      const borrowItem = borrowRequest.items.find(i => i.id === itemSeeding.borrowRequestItemId);

      if (!borrowItem) {
        return NextResponse.json({ 
          error: `Borrow request item ${itemSeeding.borrowRequestItemId} not found` 
        }, { status: 404 });
      }

      // Get all stock records for this item
      const stockRecords = await db.query.itemStock.findMany({
        where: eq(itemStock.itemId, borrowItem.itemId),
      });

      if (!stockRecords || stockRecords.length === 0) {
        return NextResponse.json({ 
          error: `Stock information not found for item ${borrowItem.itemId}` 
        }, { status: 404 });
      }

      // Find the borrowed stock record (boxId = null, has onBorrow > 0)
      const borrowedStock = stockRecords.find(s => s.boxId === null && s.onBorrow >= borrowItem.quantity);
      
      if (!borrowedStock) {
        return NextResponse.json({ 
          error: `Cannot find borrowed stock record for item ${borrowItem.itemId}` 
        }, { status: 404 });
      }

      // Check if there's already a seeded stock record (boxId = null)
      let seededStockRecord = stockRecords.find(s => s.boxId === null && s.seeded > 0);
      
      if (seededStockRecord) {
        // Update existing seeded stock record
        await db.update(itemStock)
          .set({
            seeded: seededStockRecord.seeded + borrowItem.quantity,
            updatedAt: now,
          })
          .where(eq(itemStock.id, seededStockRecord.id));
      } else {
        // Create new stock record for seeded items (no box location)
        const [newSeededStock] = await db.insert(itemStock).values({
          itemId: borrowItem.itemId,
          pending: 0,
          inStorage: 0,
          onBorrow: 0,
          inClearance: 0,
          seeded: borrowItem.quantity,
          boxId: null, // No location for seeded items
          condition: borrowedStock.condition,
          conditionNotes: 'Items marked as seeded (lost or damaged)',
          createdAt: now,
          updatedAt: now,
        }).returning();
        
        seededStockRecord = newSeededStock;
      }
      
      // Update borrowed stock (reduce onBorrow)
      const newOnBorrow = Math.max(0, borrowedStock.onBorrow - borrowItem.quantity);
      await db.update(itemStock)
        .set({
          onBorrow: newOnBorrow,
          updatedAt: now,
        })
        .where(eq(itemStock.id, borrowedStock.id));

      // Delete borrowed stock record if empty
      if (shouldDeleteStockRecord({
        ...borrowedStock,
        onBorrow: newOnBorrow
      })) {
        await db.delete(itemStock)
          .where(eq(itemStock.id, borrowedStock.id));
        
        console.log(`Deleted empty borrowed stock record ${borrowedStock.id} for item ${borrowItem.itemId}`);
      }

      // Create a stock movement record
      await db.insert(stockMovements).values({
        itemId: borrowItem.itemId,
        stockId: seededStockRecord.id,
        movementType: 'seed',
        quantity: borrowItem.quantity,
        fromState: 'borrowed',
        toState: 'seeded',
        referenceId: borrowRequestId,
        referenceType: 'borrow_request_item',
        performedBy: session.user.id,
        notes: itemSeeding.reason,
        createdAt: now,
      });

      // Update borrow request item status
      await db.update(borrowRequestItems)
        .set({
          status: 'seeded',
          seededAt: now,
          seededBy: session.user.id,
        })
        .where(eq(borrowRequestItems.id, itemSeeding.borrowRequestItemId));
    }

    // Check if all borrow request items are now complete or seeded
    const updatedBorrowRequest = await db.query.borrowRequests.findFirst({
      where: eq(borrowRequests.id, borrowRequestId),
      with: {
        items: true,
      },
    });

    const allItemsCompleted = updatedBorrowRequest?.items.every(item => 
      ['complete', 'seeded'].includes(item.status)
    );

    // Update borrow request status if all items are completed/seeded
    if (allItemsCompleted) {
      await db.update(borrowRequests)
        .set({
          status: 'seeded',
          seededAt: now,
          seededBy: session.user.id,
        })
        .where(eq(borrowRequests.id, borrowRequestId));
    }

    return NextResponse.json({
      message: 'Items marked as seeded successfully',
      borrowRequestId,
      borrowRequestStatus: allItemsCompleted ? 'seeded' : 'active',
      itemsProcessed: itemsSeeding.length,
    });
  } catch (error) {
    console.error('Error seeding borrow request:', error);
    return NextResponse.json({ 
      error: 'Failed to mark items as seeded',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
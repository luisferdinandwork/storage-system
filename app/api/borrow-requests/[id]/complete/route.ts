// app/api/borrow-requests/[id]/complete/route.ts
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { borrowRequests, borrowRequestItems, itemStock, stockMovements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

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
        error: 'Only storage masters can complete borrow requests' 
      }, { status: 403 });
    }

    const { id: borrowRequestId } = await params;
    const body = await request.json();
    const { items: itemsCompletion } = body;

    if (!itemsCompletion || !Array.isArray(itemsCompletion) || itemsCompletion.length === 0) {
      return NextResponse.json({ 
        error: 'Items completion data is required' 
      }, { status: 400 });
    }

    // Validate each item completion entry
    for (const item of itemsCompletion) {
      if (!item.borrowRequestItemId || !item.status) {
        return NextResponse.json({ 
          error: 'Each item must have borrowRequestItemId and status (complete or seeded)' 
        }, { status: 400 });
      }

      if (!['complete', 'seeded'].includes(item.status)) {
        return NextResponse.json({ 
          error: 'Status must be either "complete" or "seeded"' 
        }, { status: 400 });
      }

      if (item.status === 'complete' && (!item.returnCondition || !['excellent', 'good', 'fair', 'poor'].includes(item.returnCondition))) {
        return NextResponse.json({ 
          error: 'Return condition is required for completed items and must be one of: excellent, good, fair, poor' 
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
        error: 'Only active borrow requests can be completed' 
      }, { status: 400 });
    }

    const now = new Date();
    let hasCompletedItems = false;

    // Update each borrow request item
    for (const itemCompletion of itemsCompletion) {
      const borrowItem = borrowRequest.items.find(i => i.id === itemCompletion.borrowRequestItemId);

      if (!borrowItem) {
        return NextResponse.json({ 
          error: `Borrow request item ${itemCompletion.borrowRequestItemId} not found` 
        }, { status: 404 });
      }

      // Get the current stock for this item
      const currentStock = await db.query.itemStock.findFirst({
        where: eq(itemStock.itemId, borrowItem.itemId),
      });

      if (!currentStock) {
        return NextResponse.json({ 
          error: `Stock information not found for item ${borrowItem.itemId}` 
        }, { status: 404 });
      }

      if (itemCompletion.status === 'complete') {
        hasCompletedItems = true;
        
        // Return the item to storage
        await db.update(borrowRequestItems)
          .set({
            status: 'complete',
            returnCondition: itemCompletion.returnCondition,
            returnNotes: itemCompletion.returnNotes || null,
            completedAt: now,
            completedBy: session.user.id,
          })
          .where(eq(borrowRequestItems.id, itemCompletion.borrowRequestItemId));

        // Update item stock - return the borrowed quantity to inStorage
        await db.update(itemStock)
          .set({
            inStorage: currentStock.inStorage + borrowItem.quantity,
            onBorrow: Math.max(0, currentStock.onBorrow - borrowItem.quantity),
            condition: itemCompletion.returnCondition,
            conditionNotes: itemCompletion.returnNotes || null,
            updatedAt: now,
          })
          .where(eq(itemStock.itemId, borrowItem.itemId));

        // Create a stock movement record
        await db.insert(stockMovements).values({
          itemId: borrowItem.itemId,
          stockId: currentStock.id,
          movementType: 'complete',
          quantity: borrowItem.quantity,
          fromState: 'borrowed',
          toState: 'storage',
          referenceId: borrowRequestId,
          referenceType: 'borrow_request_item',
          performedBy: session.user.id,
          notes: `Item returned in ${itemCompletion.returnCondition} condition`,
          createdAt: now,
        });

      } else if (itemCompletion.status === 'seeded') {
        // Move the item to seeded state
        await db.update(borrowRequestItems)
          .set({
            status: 'seeded',
            seededAt: now,
            seededBy: session.user.id,
          })
          .where(eq(borrowRequestItems.id, itemCompletion.borrowRequestItemId));

        // Update item stock - move from onBorrow to seeded
        await db.update(itemStock)
          .set({
            onBorrow: Math.max(0, currentStock.onBorrow - borrowItem.quantity),
            seeded: currentStock.seeded + borrowItem.quantity,
            updatedAt: now,
          })
          .where(eq(itemStock.itemId, borrowItem.itemId));

        // Create a stock movement record
        await db.insert(stockMovements).values({
          itemId: borrowItem.itemId,
          stockId: currentStock.id,
          movementType: 'seed',
          quantity: borrowItem.quantity,
          fromState: 'borrowed',
          toState: 'seeded',
          referenceId: borrowRequestId,
          referenceType: 'borrow_request_item',
          performedBy: session.user.id,
          notes: 'Item marked as seeded (lost or damaged)',
          createdAt: now,
        });
      }
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
          status: 'complete',
          completedAt: now,
          completedBy: session.user.id,
          // Update end date to today's date if any items were marked as complete
          endDate: hasCompletedItems ? now : borrowRequest.endDate,
        })
        .where(eq(borrowRequests.id, borrowRequestId));
    } else if (hasCompletedItems) {
      // Even if not all items are completed, update the end date if any items were marked as complete
      await db.update(borrowRequests)
        .set({
          endDate: now,
        })
        .where(eq(borrowRequests.id, borrowRequestId));
    }

    return NextResponse.json({
      message: 'Items processed successfully',
      borrowRequestId,
      borrowRequestStatus: allItemsCompleted ? 'complete' : 'active',
      itemsProcessed: itemsCompletion.length,
      endDateUpdated: hasCompletedItems,
    });
  } catch (error) {
    console.error('Error completing borrow request:', error);
    return NextResponse.json({ 
      error: 'Failed to complete borrow request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
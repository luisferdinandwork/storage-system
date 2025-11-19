// app/api/borrow-requests/[id]/complete/route.ts

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { borrowRequests, borrowRequestItems, itemStock, stockMovements, boxes } from "@/lib/db/schema";
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

      if (item.status === 'complete') {
        if (!item.returnCondition || !['excellent', 'good', 'fair', 'poor'].includes(item.returnCondition)) {
          return NextResponse.json({ 
            error: 'Return condition is required for completed items and must be one of: excellent, good, fair, poor' 
          }, { status: 400 });
        }
        
        if (!item.boxId) {
          return NextResponse.json({ 
            error: 'Box ID is required for completed items' 
          }, { status: 400 });
        }
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

      // Get all stock records for this item
      const stockRecords = await db.query.itemStock.findMany({
        where: eq(itemStock.itemId, borrowItem.itemId),
      });

      if (!stockRecords || stockRecords.length === 0) {
        return NextResponse.json({ 
          error: `Stock information not found for item ${borrowItem.itemId}` 
        }, { status: 404 });
      }

      if (itemCompletion.status === 'complete') {
        hasCompletedItems = true;
        
        // Validate boxId
        const box = await db.query.boxes.findFirst({
          where: eq(boxes.id, itemCompletion.boxId)
        });
        
        if (!box) {
          return NextResponse.json({ 
            error: `Box with ID ${itemCompletion.boxId} not found` 
          }, { status: 400 });
        }

        // Find the borrowed stock record (boxId = null, has onBorrow > 0)
        const borrowedStock = stockRecords.find(s => s.boxId === null && s.onBorrow >= borrowItem.quantity);
        
        if (!borrowedStock) {
          return NextResponse.json({ 
            error: `Cannot find borrowed stock record for item ${borrowItem.itemId}` 
          }, { status: 404 });
        }

        // Check if there's already a stock record for the target box
        const targetBoxStock = stockRecords.find(s => s.boxId === itemCompletion.boxId);

        if (targetBoxStock) {
          // Target box already has stock - merge into it
          await db.update(itemStock)
            .set({
              inStorage: targetBoxStock.inStorage + borrowItem.quantity,
              condition: getWorseCondition(targetBoxStock.condition, itemCompletion.returnCondition),
              conditionNotes: itemCompletion.returnNotes 
                ? `${targetBoxStock.conditionNotes || ''}\n[${now.toISOString()}] ${itemCompletion.returnNotes}`.trim()
                : targetBoxStock.conditionNotes,
              updatedAt: now,
            })
            .where(eq(itemStock.id, targetBoxStock.id));

          // Create stock movement record
          await db.insert(stockMovements).values({
            itemId: borrowItem.itemId,
            stockId: targetBoxStock.id,
            movementType: 'complete',
            quantity: borrowItem.quantity,
            fromState: 'borrowed',
            toState: 'storage',
            referenceId: borrowRequestId,
            referenceType: 'borrow_request_item',
            boxId: itemCompletion.boxId,
            performedBy: session.user.id,
            notes: `Item returned to box in ${itemCompletion.returnCondition} condition`,
            createdAt: now,
          });

        } else {
          // No stock exists for target box - create new one
          const [newStock] = await db.insert(itemStock).values({
            itemId: borrowItem.itemId,
            pending: 0,
            inStorage: borrowItem.quantity,
            onBorrow: 0,
            inClearance: 0,
            seeded: 0,
            boxId: itemCompletion.boxId,
            condition: itemCompletion.returnCondition,
            conditionNotes: itemCompletion.returnNotes || null,
            createdAt: now,
            updatedAt: now,
          }).returning();

          // Create stock movement record
          await db.insert(stockMovements).values({
            itemId: borrowItem.itemId,
            stockId: newStock.id,
            movementType: 'complete',
            quantity: borrowItem.quantity,
            fromState: 'borrowed',
            toState: 'storage',
            referenceId: borrowRequestId,
            referenceType: 'borrow_request_item',
            boxId: itemCompletion.boxId,
            performedBy: session.user.id,
            notes: `Item returned to new box in ${itemCompletion.returnCondition} condition`,
            createdAt: now,
          });
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
        if (shouldDeleteStockRecord(borrowedStock, newOnBorrow)) {
          await db.delete(itemStock)
            .where(eq(itemStock.id, borrowedStock.id));
          
          console.log(`Deleted empty borrowed stock record ${borrowedStock.id}`);
        }
        
        // Update borrow request item
        await db.update(borrowRequestItems)
          .set({
            status: 'complete',
            returnCondition: itemCompletion.returnCondition,
            returnNotes: itemCompletion.returnNotes || null,
            completedAt: now,
            completedBy: session.user.id,
          })
          .where(eq(borrowRequestItems.id, itemCompletion.borrowRequestItemId));

      } else if (itemCompletion.status === 'seeded') {
        // Find the borrowed stock record
        const borrowedStock = stockRecords.find(s => s.boxId === null && s.onBorrow >= borrowItem.quantity);
        
        if (!borrowedStock) {
          return NextResponse.json({ 
            error: `Cannot find borrowed stock record for item ${borrowItem.itemId}` 
          }, { status: 404 });
        }

        // Update borrow request item
        await db.update(borrowRequestItems)
          .set({
            status: 'seeded',
            seededAt: now,
            seededBy: session.user.id,
          })
          .where(eq(borrowRequestItems.id, itemCompletion.borrowRequestItemId));

        // Move from onBorrow to seeded in the borrowed stock record
        const newOnBorrow = Math.max(0, borrowedStock.onBorrow - borrowItem.quantity);
        await db.update(itemStock)
          .set({
            onBorrow: newOnBorrow,
            seeded: borrowedStock.seeded + borrowItem.quantity,
            updatedAt: now,
          })
          .where(eq(itemStock.id, borrowedStock.id));

        // Delete borrowed stock record if empty
        if (shouldDeleteStockRecord(borrowedStock, newOnBorrow)) {
          await db.delete(itemStock)
            .where(eq(itemStock.id, borrowedStock.id));
          
          console.log(`Deleted empty borrowed stock record ${borrowedStock.id}`);
        }

        // Create stock movement record
        await db.insert(stockMovements).values({
          itemId: borrowItem.itemId,
          stockId: borrowedStock.id,
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

    // Check if all items are complete/seeded
    const updatedBorrowRequest = await db.query.borrowRequests.findFirst({
      where: eq(borrowRequests.id, borrowRequestId),
      with: {
        items: true,
      },
    });

    const allItemsCompleted = updatedBorrowRequest?.items.every(item => 
      ['complete', 'seeded'].includes(item.status)
    );

    if (allItemsCompleted) {
      await db.update(borrowRequests)
        .set({
          status: 'complete',
          completedAt: now,
          completedBy: session.user.id,
          endDate: hasCompletedItems ? now : borrowRequest.endDate,
        })
        .where(eq(borrowRequests.id, borrowRequestId));
    } else if (hasCompletedItems) {
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

// Helper function to determine the worse condition
function getWorseCondition(
  condition1: 'excellent' | 'good' | 'fair' | 'poor',
  condition2: 'excellent' | 'good' | 'fair' | 'poor'
): 'excellent' | 'good' | 'fair' | 'poor' {
  const conditionOrder = { excellent: 4, good: 3, fair: 2, poor: 1 };
  return conditionOrder[condition1] < conditionOrder[condition2] ? condition1 : condition2;
}

// Helper function to check if stock record should be deleted
function shouldDeleteStockRecord(
  stock: {
    pending: number;
    inStorage: number;
    onBorrow: number;
    inClearance: number;
    seeded: number;
  },
  newOnBorrow: number
): boolean {
  return (
    stock.pending === 0 &&
    stock.inStorage === 0 &&
    newOnBorrow === 0 &&
    stock.inClearance === 0 &&
    stock.seeded === 0
  );
}
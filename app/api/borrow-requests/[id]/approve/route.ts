// APPROVE ROUTE - app/api/borrow-requests/[id]/approve/route.ts
// WITH STOCK RECORD CLEANUP

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests, borrowRequestItems, items, itemStock, stockMovements } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: requestId } = await params;
    const { approvalType } = await request.json();

    if (!approvalType || !['manager', 'storage'].includes(approvalType)) {
      return NextResponse.json(
        { error: 'Invalid approval type' },
        { status: 400 }
      );
    }

    const borrowRequest = await db.query.borrowRequests.findFirst({
      where: eq(borrowRequests.id, requestId),
      with: {
        items: {
          with: {
            item: true,
          },
        },
        user: true,
      },
    });

    if (!borrowRequest) {
      return NextResponse.json({ error: 'Borrow request not found' }, { status: 404 });
    }

    const userRole = session.user.role;
    const isManager = userRole === 'manager';
    const isStorageMaster = ['storage-master', 'storage-master-manager', 'superadmin'].includes(userRole);
    
    if (approvalType === 'manager' && !isManager && !isStorageMaster) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (approvalType === 'storage' && !isStorageMaster) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (approvalType === 'manager' && borrowRequest.status !== 'pending_manager') {
      return NextResponse.json(
        { error: 'This request is not waiting for manager approval' },
        { status: 400 }
      );
    }
    
    if (approvalType === 'storage' && borrowRequest.status !== 'pending_storage') {
      return NextResponse.json(
        { error: 'This request is not waiting for storage approval' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (approvalType === 'manager') {
      updateData.managerApprovedBy = session.user.id;
      updateData.managerApprovedAt = new Date();
      updateData.status = 'pending_storage';
    } else {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 14);
      updateData.storageApprovedBy = session.user.id;
      updateData.storageApprovedAt = new Date();
      updateData.status = 'active';
      updateData.startDate = now; 
      updateData.endDate = endDate; 
      
      // Process each item in the borrow request
      for (const requestItem of borrowRequest.items) {
        const item = requestItem.item;
        
        // Get all stock records for this item
        const stockRecords = await db.select().from(itemStock).where(eq(itemStock.itemId, item.productCode)) as typeof itemStock.$inferSelect[];
        
        if (!stockRecords || stockRecords.length === 0) {
          return NextResponse.json({ 
            error: `No stock records found for item ${item.productCode}` 
          }, { status: 404 });
        }
        
        // Find stock record with sufficient quantity and a box location
        const sourceStock = stockRecords.find(s => 
          s.boxId !== null && s.inStorage >= requestItem.quantity
        );
        
        if (!sourceStock) {
          const totalAvailable = stockRecords.reduce((sum, s) => sum + s.inStorage, 0);
          const availableInBoxes = stockRecords
            .filter(s => s.boxId !== null)
            .reduce((sum, s) => sum + s.inStorage, 0);
            
          return NextResponse.json({ 
            error: `Insufficient stock for item ${item.productCode}. Available in boxes: ${availableInBoxes}, Requested: ${requestItem.quantity}, Total available: ${totalAvailable}` 
          }, { status: 400 });
        }
        
        // Check if there's already a "borrowed" stock record (boxId = null)
        let borrowedStockRecord = stockRecords.find((s): s is typeof itemStock.$inferSelect => s.boxId === null);
        
        if (borrowedStockRecord) {
          // Update existing borrowed stock record
          await db.update(itemStock)
            .set({
              onBorrow: borrowedStockRecord.onBorrow + requestItem.quantity,
              updatedAt: now,
            })
            .where(eq(itemStock.id, borrowedStockRecord.id));
        } else {
          // Create new stock record for borrowed items (no box location)
          const [newBorrowedStock] = await db.insert(itemStock).values({
            itemId: item.productCode,
            pending: 0,
            inStorage: 0,
            onBorrow: requestItem.quantity,
            inClearance: 0,
            seeded: 0,
            boxId: null, // No location for borrowed items
            condition: sourceStock.condition,
            conditionNotes: 'Items currently on borrow',
            createdAt: now,
            updatedAt: now,
          }).returning();
          
          borrowedStockRecord = newBorrowedStock;
        }
        
        // Calculate new inStorage value for source stock
        const newInStorage = sourceStock.inStorage - requestItem.quantity;
        
        // Update source stock (reduce inStorage)
        await db.update(itemStock)
          .set({
            inStorage: newInStorage,
            updatedAt: now,
          })
          .where(eq(itemStock.id, sourceStock.id));
        
        // Check if source stock record should be deleted (all quantities are 0)
        const shouldDelete = shouldDeleteStockRecord({
          pending: sourceStock.pending,
          inStorage: newInStorage,
          onBorrow: sourceStock.onBorrow,
          inClearance: sourceStock.inClearance,
          seeded: sourceStock.seeded,
        });
        
        if (shouldDelete) {
          // Delete the empty stock record
          await db.delete(itemStock)
            .where(eq(itemStock.id, sourceStock.id));
          
          console.log(`Deleted empty source stock record ${sourceStock.id} for item ${item.productCode}`);
        }
        
        // Create stock movement record
        await db.insert(stockMovements).values({
          itemId: item.productCode,
          stockId: borrowedStockRecord.id,
          movementType: 'borrow',
          quantity: requestItem.quantity,
          fromState: 'storage',
          toState: 'borrowed',
          referenceId: borrowRequest.id,
          referenceType: 'borrow_request',
          boxId: sourceStock.boxId,
          performedBy: session.user.id,
          notes: `Approved by storage: ${borrowRequest.reason}. Items borrowed from box ${sourceStock.boxId}.`,
        });
        
        // Update borrow request item status
        await db.update(borrowRequestItems)
          .set({
            status: 'active',
          })
          .where(eq(borrowRequestItems.id, requestItem.id));
      }
    }

    await db.update(borrowRequests)
      .set(updateData)
      .where(eq(borrowRequests.id, requestId));

    return NextResponse.json({
      message: `Borrow request ${approvalType === 'manager' ? 'manager' : 'storage'} approved successfully`,
      status: updateData.status,
    });
  } catch (error) {
    console.error('Failed to approve borrow request:', error);
    return NextResponse.json(
      { error: 'Failed to approve borrow request' },
      { status: 500 }
    );
  }
}
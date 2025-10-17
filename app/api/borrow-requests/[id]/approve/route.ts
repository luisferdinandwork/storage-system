// app/api/borrow-requests/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests, borrowRequestItems, items, itemStock, stockMovements } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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
    const { approvalType } = await request.json(); // 'manager' or 'storage'

    if (!approvalType || !['manager', 'storage'].includes(approvalType)) {
      return NextResponse.json(
        { error: 'Invalid approval type' },
        { status: 400 }
      );
    }

    // Get the borrow request with items
    const borrowRequest = await db.query.borrowRequests.findFirst({
      where: eq(borrowRequests.id, requestId),
      with: {
        items: {
          with: {
            item: {
              with: {
                stock: true,
              },
            },
          },
        },
        user: true,
      },
    });

    if (!borrowRequest) {
      return NextResponse.json({ error: 'Borrow request not found' }, { status: 404 });
    }

    // Check if user has permission to approve
    const userRole = session.user.role;
    const isManager = userRole === 'manager';
    const isStorageMaster = ['storage-master', 'storage-master-manager', 'superadmin'].includes(userRole);
    
    if (approvalType === 'manager' && !isManager && !isStorageMaster) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (approvalType === 'storage' && !isStorageMaster) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if the request is in the correct status for this approval
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

    // Update the borrow request
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (approvalType === 'manager') {
      updateData.managerApprovedBy = session.user.id;
      updateData.managerApprovedAt = new Date();
      updateData.status = 'pending_storage'; // Move to next approval step
    } else {
      updateData.storageApprovedBy = session.user.id;
      updateData.storageApprovedAt = new Date();
      updateData.status = 'active'; // Set to active instead of approved
      
      // Update stock and create stock movements
      for (const requestItem of borrowRequest.items) {
        const item = requestItem.item;
        const stock = item.stock;
        
        if (!stock) {
          console.error(`No stock record found for item ${item.id}`);
          continue;
        }
        
        // Update stock quantities
        await db.update(itemStock)
          .set({
            inStorage: stock.inStorage - requestItem.quantity,
            onBorrow: stock.onBorrow + requestItem.quantity,
            updatedAt: new Date(),
          })
          .where(eq(itemStock.id, stock.id));
        
        // Create stock movement record
        await db.insert(stockMovements).values({
          itemId: item.id,
          stockId: stock.id,
          movementType: 'borrow',
          quantity: requestItem.quantity,
          fromState: 'storage',
          toState: 'borrowed',
          referenceId: borrowRequest.id,
          referenceType: 'borrow_request',
          performedBy: session.user.id,
          notes: `Approved by ${approvalType}: ${borrowRequest.reason}`,
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
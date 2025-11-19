// app/api/item-requests/bulk-reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { itemRequests, items, itemStock, itemImages, borrowRequestItems, itemClearances, stockMovements, users } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['superadmin', 'storage-master', 'storage-master-manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the user exists in the database
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found in database',
        userId: session.user.id 
      }, { status: 404 });
    }

    const { requestIds, reason } = await request.json();

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        { error: 'Request IDs are required' },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Get all item requests
    const itemRequestsList = await db.query.itemRequests.findMany({
      where: inArray(itemRequests.id, requestIds),
      with: {
        item: true,
      },
    });

    if (itemRequestsList.length === 0) {
      return NextResponse.json({ error: 'No valid item requests found' }, { status: 404 });
    }

    // Filter out requests that are not pending
    const pendingRequests = itemRequestsList.filter(req => req.status === 'pending');
    
    if (pendingRequests.length === 0) {
      return NextResponse.json(
        { error: 'No pending requests found' },
        { status: 400 }
      );
    }

    // Get the IDs of pending requests and their corresponding product codes
    const pendingRequestIds = pendingRequests.map(req => req.id);
    const productCodes = pendingRequests.map(req => req.itemId); // These are product codes

    // Update all pending item requests to rejected
    await db
      .update(itemRequests)
      .set({
        status: 'rejected',
        approvedBy: user.id,
        approvedAt: new Date(),
        rejectionReason: reason,
      })
      .where(inArray(itemRequests.id, pendingRequestIds));

    // Update all items to rejected
    await db
      .update(items)
      .set({
        status: 'rejected',
        approvedBy: user.id,
        approvedAt: new Date(),
      })
      .where(inArray(items.productCode, productCodes)); // Use productCode instead of id

    // Delete all related records in the correct order to avoid foreign key constraint errors
    // 1. Delete stock movements
    await db.delete(stockMovements)
      .where(inArray(stockMovements.itemId, productCodes));
    
    // 2. Delete borrow request items
    await db.delete(borrowRequestItems)
      .where(inArray(borrowRequestItems.itemId, productCodes));
    
    // 3. Delete item clearances
    await db.delete(itemClearances)
      .where(inArray(itemClearances.itemId, productCodes));
    
    // 4. Delete item images
    await db.delete(itemImages)
      .where(inArray(itemImages.itemId, productCodes));
    
    // 5. Delete item stock
    await db.delete(itemStock)
      .where(inArray(itemStock.itemId, productCodes));
    
    // 6. Finally, delete the items using productCode
    const deletedItems = await db.delete(items)
      .where(inArray(items.productCode, productCodes))
      .returning({ productCode: items.productCode });

    return NextResponse.json({ 
      message: `${deletedItems.length} items rejected and removed successfully`,
      rejectedCount: deletedItems.length,
      rejectedProductCodes: deletedItems.map(item => item.productCode),
      reason: reason
    });
  } catch (error) {
    console.error('Failed to reject and remove items:', error);
    return NextResponse.json(
      { error: 'Failed to reject and remove items', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
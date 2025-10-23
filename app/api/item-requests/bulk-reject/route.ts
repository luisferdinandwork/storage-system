// app/api/item-requests/bulk-reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { itemRequests, items, itemStock, itemImages, borrowRequestItems, itemClearances, stockMovements } from '@/lib/db/schema';
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

    // Get the IDs of pending requests and their corresponding item IDs
    const pendingRequestIds = pendingRequests.map(req => req.id);
    const itemIds = pendingRequests.map(req => req.itemId);

    // Delete all related records in the correct order to avoid foreign key constraint errors
    // 1. Delete stock movements
    await db.delete(stockMovements)
      .where(inArray(stockMovements.itemId, itemIds));
    
    // 2. Delete borrow request items
    await db.delete(borrowRequestItems)
      .where(inArray(borrowRequestItems.itemId, itemIds));
    
    // 3. Delete item clearances
    await db.delete(itemClearances)
      .where(inArray(itemClearances.itemId, itemIds));
    
    // 4. Delete item images
    await db.delete(itemImages)
      .where(inArray(itemImages.itemId, itemIds));
    
    // 5. Delete item stock
    await db.delete(itemStock)
      .where(inArray(itemStock.itemId, itemIds));
    
    // 6. Delete item requests
    await db.delete(itemRequests)
      .where(inArray(itemRequests.id, pendingRequestIds));
    
    // 7. Finally, delete the items
    const deletedItems = await db.delete(items)
      .where(inArray(items.id, itemIds))
      .returning({ id: items.id });

    return NextResponse.json({ 
      message: `${deletedItems.length} items rejected and removed successfully`,
      rejectedCount: deletedItems.length,
      reason: reason
    });
  } catch (error) {
    console.error('Failed to reject and remove items:', error);
    return NextResponse.json(
      { error: 'Failed to reject and remove items' },
      { status: 500 }
    );
  }
}
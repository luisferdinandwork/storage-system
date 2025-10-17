// app/api/item-requests/bulk-reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { itemRequests, items, itemStock } from '@/lib/db/schema';
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

    // Get the IDs of pending requests
    const pendingRequestIds = pendingRequests.map(req => req.id);

    // Update all pending item requests to rejected
    await db
      .update(itemRequests)
      .set({
        status: 'rejected',
        approvedBy: session.user.id,
        approvedAt: new Date(),
        rejectionReason: reason,
      })
      .where(inArray(itemRequests.id, pendingRequestIds));

    // Update all items to rejected
    const itemIds = pendingRequests.map(req => req.itemId);
    await db
      .update(items)
      .set({
        status: 'rejected',
      })
      .where(inArray(items.id, itemIds));

    // Update all item stocks to set pending to 0 when items are rejected
    await db
      .update(itemStock)
      .set({
        updatedAt: new Date(),
      })
      .where(inArray(itemStock.itemId, itemIds));

    // Update pending to 0 for each item
    for (const request of pendingRequests) {
      await db
        .update(itemStock)
        .set({
          pending: 0, // Set pending to 0 when item is rejected
          updatedAt: new Date(),
        })
        .where(eq(itemStock.itemId, request.itemId));
    }

    return NextResponse.json({ 
      message: `${pendingRequests.length} items rejected successfully`,
      rejectedCount: pendingRequests.length,
      reason: reason
    });
  } catch (error) {
    console.error('Failed to reject items:', error);
    return NextResponse.json(
      { error: 'Failed to reject items' },
      { status: 500 }
    );
  }
}
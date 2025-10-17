// app/api/item-requests/bulk-approve/route.ts
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

    const { requestIds, location } = await request.json();

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        { error: 'Request IDs are required' },
        { status: 400 }
      );
    }

    if (!location) {
      return NextResponse.json(
        { error: 'Storage location is required' },
        { status: 400 }
      );
    }

    // Validate location against allowed enum values
    const allowedLocations = ['Storage 1', 'Storage 2', 'Storage 3'];
    if (!allowedLocations.includes(location)) {
      return NextResponse.json(
        { error: `Invalid location. Allowed values: ${allowedLocations.join(', ')}` },
        { status: 400 }
      );
    }

    // Get all item requests with item details
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

    // Update all pending item requests to approved
    await db
      .update(itemRequests)
      .set({
        status: 'approved',
        approvedBy: session.user.id,
        approvedAt: new Date(),
      })
      .where(inArray(itemRequests.id, pendingRequestIds));

    // Update all items to approved
    const itemIds = pendingRequests.map(req => req.itemId);
    await db
      .update(items)
      .set({
        status: 'approved',
        approvedBy: session.user.id,
        approvedAt: new Date(),
      })
      .where(inArray(items.id, itemIds));

    // Update all item stocks with location and set pending to 0
    await db
      .update(itemStock)
      .set({
        location: location,
        updatedAt: new Date(),
      })
      .where(inArray(itemStock.itemId, itemIds));

    // Update inStorage quantity and set pending to 0 for each item
    for (const request of pendingRequests) {
      await db
        .update(itemStock)
        .set({
          inStorage: request.item.totalStock,
          pending: 0, // Set pending to 0 when item is approved
          updatedAt: new Date(),
        })
        .where(eq(itemStock.itemId, request.itemId));
    }

    return NextResponse.json({ 
      message: `${pendingRequests.length} items approved and stored successfully`,
      approvedCount: pendingRequests.length,
      location: location,
      status: 'approved'
    });
  } catch (error) {
    console.error('Failed to approve items:', error);
    return NextResponse.json(
      { error: 'Failed to approve items' },
      { status: 500 }
    );
  }
}
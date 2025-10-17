// app/api/item-requests/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { itemRequests, items, itemStock } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['superadmin', 'storage-master', 'storage-master-manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: requestId } = await params;
    const { location } = await request.json();

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

    // Get the item request with item details
    const itemRequest = await db.query.itemRequests.findFirst({
      where: eq(itemRequests.id, requestId),
      with: {
        item: true,
      },
    });

    if (!itemRequest) {
      return NextResponse.json({ error: 'Item request not found' }, { status: 404 });
    }

    if (itemRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Item request has already been processed' },
        { status: 400 }
      );
    }

    // Update the item request to approved
    await db
      .update(itemRequests)
      .set({
        status: 'approved',
        approvedBy: session.user.id,
        approvedAt: new Date(),
      })
      .where(eq(itemRequests.id, requestId));

    // Update the item status to approved
    await db
      .update(items)
      .set({
        status: 'approved',
        approvedBy: session.user.id,
        approvedAt: new Date(),
      })
      .where(eq(items.id, itemRequest.itemId));

    // Update the item stock with location and set pending to 0
    await db
      .update(itemStock)
      .set({
        location: location,
        inStorage: itemRequest.item.totalStock,
        pending: 0, // Set pending to 0 when item is approved
        updatedAt: new Date(),
      })
      .where(eq(itemStock.itemId, itemRequest.itemId));

    return NextResponse.json({ 
      message: 'Item approved and stored successfully',
      itemId: itemRequest.itemId,
      location: location,
      status: 'approved'
    });
  } catch (error) {
    console.error('Failed to approve item:', error);
    return NextResponse.json(
      { error: 'Failed to approve item' },
      { status: 500 }
    );
  }
}
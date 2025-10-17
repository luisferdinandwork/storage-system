// app/api/item-requests/[id]/reject/route.ts
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

    // Check if user has permission to reject items
    const allowedRoles = ['superadmin', 'storage-master', 'storage-master-manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: requestId } = await params;
    const { reason } = await request.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Get the item request using Drizzle query
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

    // Update the item request
    await db
      .update(itemRequests)
      .set({
        status: 'rejected',
        approvedBy: session.user.id,
        approvedAt: new Date(),
        rejectionReason: reason,
      })
      .where(eq(itemRequests.id, requestId));

    // Update the item status to rejected
    await db
      .update(items)
      .set({
        status: 'rejected',
      })
      .where(eq(items.id, itemRequest.itemId));

    // Update the item stock to set pending to 0 when item is rejected
    await db
      .update(itemStock)
      .set({
        pending: 0, // Set pending to 0 when item is rejected
        updatedAt: new Date(),
      })
      .where(eq(itemStock.itemId, itemRequest.itemId));

    return NextResponse.json({ 
      message: 'Item rejected successfully',
      reason: reason
    });
  } catch (error) {
    console.error('Failed to reject item:', error);
    return NextResponse.json(
      { error: 'Failed to reject item' },
      { status: 500 }
    );
  }
}
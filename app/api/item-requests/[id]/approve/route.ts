import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { itemRequests, items } from '@/lib/db/schema';
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

    // Check if user has permission to approve items
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

    // Get the item request using Drizzle query
    const itemRequest = await db.query.itemRequests.findFirst({
      where: eq(itemRequests.id, requestId),
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
        status: 'approved',
        approvedBy: session.user.id,
        approvedAt: new Date(),
      })
      .where(eq(itemRequests.id, requestId));

    // Update the item with location and status
    await db
      .update(items)
      .set({
        location: location,
        status: 'available',
        approvedBy: session.user.id,
        approvedAt: new Date(),
      })
      .where(eq(items.id, itemRequest.itemId));

    return NextResponse.json({ 
      message: 'Item approved and stored successfully',
      location: location
    });
  } catch (error) {
    console.error('Failed to approve item:', error);
    return NextResponse.json(
      { error: 'Failed to approve item' },
      { status: 500 }
    );
  }
}
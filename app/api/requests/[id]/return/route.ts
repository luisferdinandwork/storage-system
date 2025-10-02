// app/api/requests/[id]/return/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests, items } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the request
    const [existingRequest] = await db
      .select()
      .from(borrowRequests)
      .where(eq(borrowRequests.id, id))
      .limit(1);

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check if the user owns this request
    if (existingRequest.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only return your own borrowed items' },
        { status: 403 }
      );
    }

    // Check if request is approved
    if (existingRequest.status !== 'approved') {
      return NextResponse.json(
        { error: 'Only approved requests can be returned' },
        { status: 400 }
      );
    }

    // Check if already returned
    if (existingRequest.returnedAt) {
      return NextResponse.json(
        { error: 'Item has already been returned' },
        { status: 400 }
      );
    }

    // Update the request to mark as returned
    const [updatedRequest] = await db
      .update(borrowRequests)
      .set({
        returnedAt: new Date(),
      })
      .where(eq(borrowRequests.id, id))
      .returning();

    // Increase the available count for the item
    const [item] = await db
      .select()
      .from(items)
      .where(eq(items.id, existingRequest.itemId))
      .limit(1);

    if (item) {
      await db
        .update(items)
        .set({ 
          available: item.available + 1 
        })
        .where(eq(items.id, existingRequest.itemId));
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error returning item:', error);
    return NextResponse.json(
      { error: 'Failed to return item' },
      { status: 500 }
    );
  }
}
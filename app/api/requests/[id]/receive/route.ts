import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests, items } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can receive items
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can receive items' }, { status: 401 });
    }

    const { id } = await params;
    const { notes } = await request.json();
    
    // Check if request exists
    const requestData = await db.select()
      .from(borrowRequests)
      .where(eq(borrowRequests.id, id))
      .limit(1);
    
    if (!requestData.length) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    const borrowRequest = requestData[0];
    
    // Check if return has been approved
    if (!borrowRequest.returnApprovedAt) {
      return NextResponse.json({ error: 'Return has not been approved yet' }, { status: 400 });
    }
    
    // Check if item has already been received
    if (borrowRequest.receivedAt) {
      return NextResponse.json({ error: 'Item has already been received' }, { status: 400 });
    }
    
    // Update the request with received timestamp
    await db.update(borrowRequests)
      .set({
        receivedAt: new Date(),
        receiveNotes: notes || null,
      })
      .where(eq(borrowRequests.id, id));
    
    // Update item inventory (increase by returned quantity)
    await db.update(items)
      .set({
        inventory: sql`${items.inventory} + ${borrowRequest.quantity}`,
      })
      .where(eq(items.id, borrowRequest.itemId));
    
    return NextResponse.json({ message: 'Item received successfully' });
  } catch (error) {
    console.error('Error receiving item:', error);
    return NextResponse.json({ error: 'Failed to receive item' }, { status: 500 });
  }
}
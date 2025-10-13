import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests, returnRequests, items } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { returnCondition, returnNotes, reason } = await request.json();
    
    if (!returnCondition || !reason) {
      return NextResponse.json({ error: 'Return condition and reason are required' }, { status: 400 });
    }
    
    // Check if request exists
    const requestData = await db.select()
      .from(borrowRequests)
      .where(eq(borrowRequests.id, id))
      .limit(1);
    
    if (!requestData.length) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    const borrowRequest = requestData[0];
    
    if (borrowRequest.status !== 'active') {
      return NextResponse.json({ error: 'Request is not in active status' }, { status: 400 });
    }
    
    if (borrowRequest.userId !== session.user.id && session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Create a return request with all required fields
    const newReturnRequest = await db.insert(returnRequests).values({
      borrowRequestId: id,
      itemId: borrowRequest.itemId,
      userId: session.user.id,
      reason: reason, // Make sure to include the reason
      returnCondition: returnCondition,
      returnNotes: returnNotes || null,
      status: 'pending', // Explicitly set the status
    }).returning();
    
    // Update borrow request status to pending_return
    await db.update(borrowRequests)
      .set({
        status: 'pending_return',
      })
      .where(eq(borrowRequests.id, id));
    
    return NextResponse.json(newReturnRequest[0], { status: 201 });
  } catch (error) {
    console.error('Error requesting return:', error);
    return NextResponse.json({ error: 'Failed to request return' }, { status: 500 });
  }
}
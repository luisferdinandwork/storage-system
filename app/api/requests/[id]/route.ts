import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests, users } from '@/lib/db/schema';
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
    
    // Check if request is in approved status
    if (borrowRequest.status !== 'approved') {
      return NextResponse.json({ error: 'Only approved requests can be returned' }, { status: 400 });
    }
    
    // Check if user is the owner of the request
    if (borrowRequest.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if return has already been requested
    if (borrowRequest.returnRequestedAt) {
      return NextResponse.json({ error: 'Return has already been requested' }, { status: 400 });
    }
    
    // Update the request with return request
    await db.update(borrowRequests)
      .set({
        returnRequestedAt: new Date(),
        returnNotes: notes || null,
      })
      .where(eq(borrowRequests.id, id));
    
    return NextResponse.json({ message: 'Return request submitted successfully' });
  } catch (error) {
    console.error('Error requesting return:', error);
    return NextResponse.json({ error: 'Failed to request return' }, { status: 500 });
  }
}
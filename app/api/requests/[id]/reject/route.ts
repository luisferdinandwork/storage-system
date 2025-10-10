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
    const { reason } = await request.json();
    
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
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
    
    if (borrowRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request is not in pending status' }, { status: 400 });
    }
    
    const isAdmin = session.user.role === 'admin';
    const isManager = session.user.role === 'manager';
    
    // Check if user is authorized to reject this request
    if (isAdmin || isManager) {
      // Update request status to rejected
      await db.update(borrowRequests)
        .set({
          status: 'rejected',
          rejectionReason: reason.trim(),
        })
        .where(eq(borrowRequests.id, id));
      
      return NextResponse.json({ message: 'Request rejected successfully' });
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error rejecting request:', error);
    return NextResponse.json({ error: 'Failed to reject request' }, { status: 500 });
  }
}
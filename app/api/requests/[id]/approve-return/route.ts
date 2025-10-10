import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests } from '@/lib/db/schema';
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

    // Only admins can approve returns
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can approve returns' }, { status: 401 });
    }

    const { id } = await params;
    
    // Check if request exists
    const requestData = await db.select()
      .from(borrowRequests)
      .where(eq(borrowRequests.id, id))
      .limit(1);
    
    if (!requestData.length) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    const borrowRequest = requestData[0];
    
    // Check if return has been requested
    if (!borrowRequest.returnRequestedAt) {
      return NextResponse.json({ error: 'No return request found' }, { status: 400 });
    }
    
    // Check if return has already been approved
    if (borrowRequest.returnApprovedAt) {
      return NextResponse.json({ error: 'Return has already been approved' }, { status: 400 });
    }
    
    // Update the request with return approval
    await db.update(borrowRequests)
      .set({
        returnApprovedBy: session.user.id,
        returnApprovedAt: new Date(),
        status: 'returned',
      })
      .where(eq(borrowRequests.id, id));
    
    return NextResponse.json({ message: 'Return approved successfully' });
  } catch (error) {
    console.error('Error approving return:', error);
    return NextResponse.json({ error: 'Failed to approve return' }, { status: 500 });
  }
}
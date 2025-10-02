// app/api/requests/[id]/reject/route.ts

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

    const { id } = await params;
    const userRole = session.user.role;

    // Only managers and admins can reject
    if (userRole !== 'manager' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Get the request
    const [existingRequest] = await db
      .select()
      .from(borrowRequests)
      .where(eq(borrowRequests.id, id))
      .limit(1);

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Check if request is still pending
    if (existingRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Request has already been processed' },
        { status: 400 }
      );
    }

    // Update the request to rejected
    const [updatedRequest] = await db
      .update(borrowRequests)
      .set({
        status: 'rejected',
        rejectionReason: reason,
      })
      .where(eq(borrowRequests.id, id))
      .returning();

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error rejecting request:', error);
    return NextResponse.json(
      { error: 'Failed to reject request' },
      { status: 500 }
    );
  }
}
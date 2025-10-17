// app/api/borrow-requests/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests, borrowRequestItems } from '@/lib/db/schema';
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

    const { id: requestId } = await params;
    const { rejectionReason, rejectionType } = await request.json(); // 'manager' or 'storage'

    if (!rejectionReason || !rejectionReason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    if (!rejectionType || !['manager', 'storage'].includes(rejectionType)) {
      return NextResponse.json(
        { error: 'Invalid rejection type' },
        { status: 400 }
      );
    }

    // Get the borrow request
    const borrowRequest = await db.query.borrowRequests.findFirst({
      where: eq(borrowRequests.id, requestId),
    });

    if (!borrowRequest) {
      return NextResponse.json({ error: 'Borrow request not found' }, { status: 404 });
    }

    // Check if user has permission to reject
    const userRole = session.user.role;
    const isManager = userRole === 'manager';
    const isStorageMaster = ['storage-master', 'storage-master-manager', 'superadmin'].includes(userRole);
    
    if (rejectionType === 'manager' && !isManager && !isStorageMaster) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (rejectionType === 'storage' && !isStorageMaster) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if the request is in the correct status for this rejection
    if (rejectionType === 'manager' && borrowRequest.status !== 'pending_manager') {
      return NextResponse.json(
        { error: 'This request is not waiting for manager approval' },
        { status: 400 }
      );
    }
    
    if (rejectionType === 'storage' && borrowRequest.status !== 'pending_storage') {
      return NextResponse.json(
        { error: 'This request is not waiting for storage approval' },
        { status: 400 }
      );
    }

    // Update the borrow request
    const updateData: any = {
      status: 'rejected',
      updatedAt: new Date(),
    };

    if (rejectionType === 'manager') {
      updateData.managerApprovedBy = session.user.id;
      updateData.managerApprovedAt = new Date();
      updateData.managerRejectionReason = rejectionReason;
    } else {
      updateData.storageApprovedBy = session.user.id;
      updateData.storageApprovedAt = new Date();
      updateData.storageRejectionReason = rejectionReason;
    }

    await db.update(borrowRequests)
      .set(updateData)
      .where(eq(borrowRequests.id, requestId));

    // Update all borrow request items to rejected
    await db.update(borrowRequestItems)
      .set({
        status: 'rejected',
      })
      .where(eq(borrowRequestItems.borrowRequestId, requestId));

    return NextResponse.json({
      message: `Borrow request rejected by ${rejectionType}`,
      reason: rejectionReason,
    });
  } catch (error) {
    console.error('Failed to reject borrow request:', error);
    return NextResponse.json(
      { error: 'Failed to reject borrow request' },
      { status: 500 }
    );
  }
}
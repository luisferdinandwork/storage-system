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
    
    const isManager = session.user.role === 'manager';
    const isStorageMaster = session.user.role === 'storage-master' || session.user.role === 'storage-master-manager';
    const isSuperAdmin = session.user.role === 'superadmin';
    
    // Check if user is authorized to reject this request
    if (isManager) {
      // Manager can only reject requests from users in their department
      if (borrowRequest.status !== 'pending_manager') {
        return NextResponse.json({ error: 'Request is not in pending_manager status' }, { status: 400 });
      }
      
      // Check if the request user is in the same department as the manager
      const manager = await db.select({
        departmentId: users.departmentId,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
      
      if (!manager.length || !manager[0].departmentId) {
        return NextResponse.json({ error: 'Manager department not found' }, { status: 400 });
      }
      
      const requestUser = await db.select({
        departmentId: users.departmentId,
      })
      .from(users)
      .where(eq(users.id, borrowRequest.userId))
      .limit(1);
      
      if (!requestUser.length || requestUser[0].departmentId !== manager[0].departmentId) {
        return NextResponse.json({ error: 'You can only reject requests from users in your department' }, { status: 403 });
      }
      
      // Update request status to rejected
      await db.update(borrowRequests)
        .set({
          status: 'rejected',
          managerRejectionReason: reason.trim(),
        })
        .where(eq(borrowRequests.id, id));
      
      return NextResponse.json({ message: 'Request rejected successfully' });
    } else if (isStorageMaster || isSuperAdmin) {
      // Storage master can reject requests that are pending_storage
      if (borrowRequest.status !== 'pending_storage') {
        return NextResponse.json({ error: 'Request is not in pending_storage status' }, { status: 400 });
      }
      
      // Update request status to rejected
      await db.update(borrowRequests)
        .set({
          status: 'rejected',
          storageRejectionReason: reason.trim(),
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
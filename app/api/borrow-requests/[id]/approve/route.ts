import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests, users, items } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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

    const { id } = await params;
    
    // Check if request exists
    const requestData = await db.select()
      .from(borrowRequests)
      .where(eq(borrowRequests.id, id))
      .limit(1);
    
    if (!requestData.length) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    const request = requestData[0];
    
    const isManager = session.user.role === 'manager';
    const isStorageMaster = session.user.role === 'storage-master' || session.user.role === 'storage-master-manager';
    const isSuperAdmin = session.user.role === 'superadmin';
    
    // Check if user is authorized to approve this request
    if (isManager) {
      // Manager can only approve requests from users in their department
      if (request.status !== 'pending_manager') {
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
      .where(eq(users.id, request.userId))
      .limit(1);
      
      if (!requestUser.length || requestUser[0].departmentId !== manager[0].departmentId) {
        return NextResponse.json({ error: 'You can only approve requests from users in your department' }, { status: 403 });
      }
      
      // Update manager approval
      await db.update(borrowRequests)
        .set({
          managerApprovedBy: session.user.id,
          managerApprovedAt: new Date(),
          status: 'pending_storage',
        })
        .where(eq(borrowRequests.id, id));
      
      return NextResponse.json({ message: 'Manager approval recorded' });
    } else if (isStorageMaster || isSuperAdmin) {
      // Storage master can approve requests that are pending_storage
      if (request.status !== 'pending_storage') {
        return NextResponse.json({ error: 'Request is not in pending_storage status' }, { status: 400 });
      }
      
      // Calculate due date (14 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);
      
      // Update storage approval and status to active
      await db.update(borrowRequests)
        .set({
          storageApprovedBy: session.user.id,
          storageApprovedAt: new Date(),
          status: 'active',
          dueDate,
        })
        .where(eq(borrowRequests.id, id));
      
      // Update item inventory (reduce by borrowed quantity)
      await db.update(items)
        .set({
          inventory: sql`${items.inventory} - ${request.quantity}`,
        })
        .where(eq(items.id, request.itemId));
      
      return NextResponse.json({ message: 'Request approved and status updated to active' });
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error approving request:', error);
    return NextResponse.json({ error: 'Failed to approve request' }, { status: 500 });
  }
}
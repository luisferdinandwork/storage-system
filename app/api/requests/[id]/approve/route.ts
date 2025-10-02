import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests, items, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: requestId } = await params;
    
    // Get the request with user and department information
    const requestData = await db.select({
      id: borrowRequests.id,
      itemId: borrowRequests.itemId,
      userId: borrowRequests.userId,
      status: borrowRequests.status,
      managerApproved: borrowRequests.managerApproved,
      adminApproved: borrowRequests.adminApproved,
      user: {
        id: users.id,
        name: users.name,
        role: users.role,
        departmentId: users.departmentId,
      },
    })
    .from(borrowRequests)
    .leftJoin(users, eq(borrowRequests.userId, users.id))
    .where(eq(borrowRequests.id, requestId))
    .limit(1);
    
    if (!requestData.length) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const borrowRequest = requestData[0];
    
    // Check if the request is still pending
    if (borrowRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request is no longer pending' }, { status: 400 });
    }

    // Check if the user is a manager
    const isRequestFromManager = borrowRequest.user?.role === 'manager';
    
    // For managers approving requests:
    // - If the request is from a regular user, they can approve (same department check)
    // - If the request is from another manager, they cannot approve
    if (session.user.role === 'manager') {
      // Managers cannot approve requests from other managers
      if (isRequestFromManager) {
        return NextResponse.json({ error: 'Managers cannot approve requests from other managers' }, { status: 403 });
      }
      
      // Get the manager's department
      const manager = await db.select({
        departmentId: users.departmentId,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
      
      if (!manager.length || !manager[0].departmentId) {
        return NextResponse.json({ error: 'Manager department not found' }, { status: 400 });
      }
      
      // Check if the request user is in the same department as the manager
      if (!borrowRequest.user || borrowRequest.user.departmentId !== manager[0].departmentId) {
        return NextResponse.json({ error: 'You can only approve requests from users in your department' }, { status: 403 });
      }
    }

    // Update the request based on the user's role
    let updateData: any = {};
    let shouldFullyApprove = false;
    
    if (session.user.role === 'admin') {
      updateData = {
        adminApproved: true,
        adminApprovedBy: session.user.id,
        adminApprovedAt: new Date(),
      };
      
      // For admin approval:
      // - If request is from manager: fully approve (only admin approval needed)
      // - If request is from user: check if manager already approved
      if (isRequestFromManager) {
        shouldFullyApprove = true;
      } else {
        // For regular users, check if manager already approved
        // Fix: Handle the nullable boolean properly
        shouldFullyApprove = borrowRequest.managerApproved === true;
      }
    } else if (session.user.role === 'manager') {
      updateData = {
        managerApproved: true,
        managerApprovedBy: session.user.id,
        managerApprovedAt: new Date(),
      };
      
      // Manager approval for regular users - don't fully approve yet, need admin approval
      shouldFullyApprove = false;
    }

    // Update the request
    await db.update(borrowRequests)
      .set(updateData)
      .where(eq(borrowRequests.id, requestId));

    // Check if request should be fully approved
    if (shouldFullyApprove) {
      // Fully approved, update status and decrease available quantity
      await db.update(borrowRequests)
        .set({ status: 'approved' })
        .where(eq(borrowRequests.id, requestId));
      
      // Get the current item to check available quantity
      const currentItem = await db.select().from(items).where(eq(items.id, borrowRequest.itemId)).limit(1);
      
      if (currentItem.length && currentItem[0].available > 0) {
        await db.update(items)
          .set({ available: currentItem[0].available - 1 })
          .where(eq(items.id, borrowRequest.itemId));
      }
    }

    return NextResponse.json({ 
      message: shouldFullyApprove ? 'Request approved successfully' : 'Request approved. Awaiting admin approval.' 
    });
  } catch (error) {
    console.error('Error approving request:', error);
    return NextResponse.json({ error: 'Failed to approve request' }, { status: 500 });
  }
}
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
    
    if (request.status !== 'pending') {
      return NextResponse.json({ error: 'Request is not in pending status' }, { status: 400 });
    }
    
    const isAdmin = session.user.role === 'admin';
    const isManager = session.user.role === 'manager';
    
    // Check if user is authorized to approve this request
    if (isAdmin) {
      // Admin can approve admin approval
      if (request.adminApproved === true) {
        return NextResponse.json({ error: 'Request already approved by admin' }, { status: 400 });
      }
      
      // Update admin approval
      await db.update(borrowRequests)
        .set({
          adminApproved: true,
          adminApprovedBy: session.user.id,
          adminApprovedAt: new Date(),
        })
        .where(eq(borrowRequests.id, id));
      
      // Check if both approvals are now true, then update status to approved
      const updatedRequest = await db.select()
        .from(borrowRequests)
        .where(eq(borrowRequests.id, id))
        .limit(1);
      
      if (updatedRequest[0].managerApproved === true && updatedRequest[0].adminApproved === true) {
        // Calculate due date (14 days from now)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        
        // Update status to approved and set due date
        await db.update(borrowRequests)
          .set({
            status: 'approved',
            dueDate,
          })
          .where(eq(borrowRequests.id, id));
        
        // Update item inventory (reduce by borrowed quantity)
        await db.update(items)
          .set({
            inventory: sql`${items.inventory} - ${updatedRequest[0].quantity}`,
          })
          .where(eq(items.id, updatedRequest[0].itemId));
        
        return NextResponse.json({ message: 'Request approved and status updated to approved' });
      }
      
      return NextResponse.json({ message: 'Admin approval recorded' });
    } else if (isManager) {
      // Manager can only approve requests from regular users
      const requestUser = await db.select()
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1);
      
      if (!requestUser.length) {
        return NextResponse.json({ error: 'Request user not found' }, { status: 404 });
      }
      
      if (requestUser[0].role === 'manager') {
        return NextResponse.json({ error: 'Managers cannot approve requests from other managers' }, { status: 403 });
      }
      
      if (request.managerApproved === true) {
        return NextResponse.json({ error: 'Request already approved by manager' }, { status: 400 });
      }
      
      // Update manager approval
      await db.update(borrowRequests)
        .set({
          managerApproved: true,
          managerApprovedBy: session.user.id,
          managerApprovedAt: new Date(),
        })
        .where(eq(borrowRequests.id, id));
      
      // Check if both approvals are now true, then update status to approved
      const updatedRequest = await db.select()
        .from(borrowRequests)
        .where(eq(borrowRequests.id, id))
        .limit(1);
      
      if (updatedRequest[0].managerApproved === true && updatedRequest[0].adminApproved === true) {
        // Calculate due date (14 days from now)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);
        
        // Update status to approved and set due date
        await db.update(borrowRequests)
          .set({
            status: 'approved',
            dueDate,
          })
          .where(eq(borrowRequests.id, id));
        
        // Update item inventory (reduce by borrowed quantity)
        await db.update(items)
          .set({
            inventory: sql`${items.inventory} - ${updatedRequest[0].quantity}`,
          })
          .where(eq(items.id, updatedRequest[0].itemId));
        
        return NextResponse.json({ message: 'Request approved and status updated to approved' });
      }
      
      return NextResponse.json({ message: 'Manager approval recorded' });
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error approving request:', error);
    return NextResponse.json({ error: 'Failed to approve request' }, { status: 500 });
  }
}
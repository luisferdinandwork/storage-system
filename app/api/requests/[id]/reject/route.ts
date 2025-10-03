import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests, users, itemSizes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,  // This is the NextRequest parameter
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { reason } = await request.json();  // Using the NextRequest parameter here
    
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }
    
    // Check if request exists
    const requestData = await db.select()  // Renamed to 'requestData' to avoid conflict
      .from(borrowRequests)
      .where(eq(borrowRequests.id, id))
      .limit(1);
    
    if (!requestData.length) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    const borrowRequest = requestData[0];  // Renamed to 'borrowRequest' to avoid conflict
    
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
      
      // Return the reserved items to available stock
      const itemSizeData = await db.select()
        .from(itemSizes)
        .where(eq(itemSizes.id, borrowRequest.itemSizeId))  // Using 'borrowRequest' here
        .limit(1);
      
      if (itemSizeData.length > 0) {
        const itemSize = itemSizeData[0];
        
        await db.update(itemSizes)
          .set({
            available: itemSize.available + borrowRequest.quantity,  // Using 'borrowRequest' here
          })
          .where(eq(itemSizes.id, itemSize.id));
      }
      
      return NextResponse.json({ message: 'Request rejected successfully' });
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error rejecting request:', error);
    return NextResponse.json({ error: 'Failed to reject request' }, { status: 500 });
  }
}
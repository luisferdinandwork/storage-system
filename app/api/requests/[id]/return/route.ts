import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests, itemSizes } from '@/lib/db/schema';
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
    
    // Check if request exists
    const requestData = await db.select()
      .from(borrowRequests)
      .where(eq(borrowRequests.id, id))
      .limit(1);
    
    if (!requestData.length) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    const request = requestData[0];
    
    if (request.status !== 'approved') {
      return NextResponse.json({ error: 'Request is not in approved status' }, { status: 400 });
    }
    
    if (request.userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Update request status to returned
    await db.update(borrowRequests)
      .set({
        status: 'returned',
        returnedAt: new Date(),
      })
      .where(eq(borrowRequests.id, id));
    
    // Return the items to available stock
    const itemSizeData = await db.select()
      .from(itemSizes)
      .where(eq(itemSizes.id, request.itemSizeId))
      .limit(1);
    
    if (itemSizeData.length > 0) {
      const itemSize = itemSizeData[0];
      
      await db.update(itemSizes)
        .set({
          available: itemSize.available + request.quantity,
        })
        .where(eq(itemSizes.id, itemSize.id));
    }
    
    return NextResponse.json({ message: 'Item returned successfully' });
  } catch (error) {
    console.error('Error returning item:', error);
    return NextResponse.json({ error: 'Failed to return item' }, { status: 500 });
  }
}
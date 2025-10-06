import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests, items, itemSizes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET handler to fetch a single request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const requestData = await db.select()
      .from(borrowRequests)
      .where(eq(borrowRequests.id, id))
      .limit(1);
    
    if (!requestData.length) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json(requestData[0]);
  } catch (error) {
    console.error('Error fetching request:', error);
    return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
  }
}

// PUT handler to update a request
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { itemId, size, quantity, startDate, endDate, reason } = await request.json();
    
    if (!itemId || !size || !quantity || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if request exists and is in pending status
    const existingRequest = await db.select()
      .from(borrowRequests)
      .where(eq(borrowRequests.id, id))
      .limit(1);
    
    if (!existingRequest.length) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    if (existingRequest[0].status !== 'pending') {
      return NextResponse.json({ error: 'Can only edit pending requests' }, { status: 400 });
    }
    
    // Check if user is authorized to edit this request
    const isAdmin = session.user.role === 'admin';
    const isManager = session.user.role === 'manager';
    const isOwner = existingRequest[0].userId === session.user.id;
    
    if (!isAdmin && !isManager && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the item size
    const itemSizeData = await db.select()
      .from(itemSizes)
      .where(and(
        eq(itemSizes.itemId, itemId),
        eq(itemSizes.size, size)
      ))
      .limit(1);
    
    if (!itemSizeData.length) {
      return NextResponse.json({ error: 'Item size not found' }, { status: 404 });
    }
    
    const itemSize = itemSizeData[0];
    
    // Check if enough items are available
    const currentRequestQuantity = existingRequest[0].quantity;
    const quantityDifference = quantity - currentRequestQuantity;
    
    if (quantityDifference > 0 && itemSize.available < quantityDifference) {
      return NextResponse.json({ error: 'Not enough items available' }, { status: 400 });
    }

    // Update the request
    await db.update(borrowRequests)
      .set({
        itemId,
        itemSizeId: itemSize.id,
        quantity,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
      })
      .where(eq(borrowRequests.id, id));

    // Update the available quantity in itemSizes if needed
    if (quantityDifference !== 0) {
      await db.update(itemSizes)
        .set({
          available: itemSize.available - quantityDifference,
        })
        .where(eq(itemSizes.id, itemSize.id));
    }

    return NextResponse.json({ message: 'Request updated successfully' });
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}

// DELETE handler to remove a request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Check if request exists and is in pending status
    const existingRequest = await db.select()
      .from(borrowRequests)
      .where(eq(borrowRequests.id, id))
      .limit(1);
    
    if (!existingRequest.length) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    if (existingRequest[0].status !== 'pending') {
      return NextResponse.json({ error: 'Can only delete pending requests' }, { status: 400 });
    }
    
    // Check if user is authorized to delete this request
    const isAdmin = session.user.role === 'admin';
    const isManager = session.user.role === 'manager';
    const isOwner = existingRequest[0].userId === session.user.id;
    
    if (!isAdmin && !isManager && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the item size to update available quantity
    const itemSizeData = await db.select()
      .from(itemSizes)
      .where(eq(itemSizes.id, existingRequest[0].itemSizeId))
      .limit(1);
    
    if (itemSizeData.length > 0) {
      const itemSize = itemSizeData[0];
      
      // Update the available quantity in itemSizes
      await db.update(itemSizes)
        .set({
          available: itemSize.available + existingRequest[0].quantity,
        })
        .where(eq(itemSizes.id, itemSize.id));
    }

    // Delete the request
    await db.delete(borrowRequests).where(eq(borrowRequests.id, id));

    return NextResponse.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Error deleting request:', error);
    return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 });
  }
}
// app/api/item-requests/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { itemRequests, items, itemStock, stockMovements, boxes, users, locations } from '@/lib/db/schema';
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

    const allowedRoles = ['superadmin', 'storage-master', 'storage-master-manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the user exists in the database
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found in database',
        userId: session.user.id 
      }, { status: 404 });
    }

    const { id: requestId } = await params;
    const { boxId } = await request.json();

    if (!boxId) {
      return NextResponse.json(
        { error: 'Storage box is required' },
        { status: 400 }
      );
    }

    // Get the item request with item and stock details
    const itemRequest = await db.query.itemRequests.findFirst({
      where: eq(itemRequests.id, requestId),
      with: {
        item: {
          with: {
            stock: true
          }
        },
      },
    });

    if (!itemRequest) {
      return NextResponse.json({ error: 'Item request not found' }, { status: 404 });
    }

    if (itemRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Item request has already been processed' },
        { status: 400 }
      );
    }

    if (!itemRequest.item.stock) {
      return NextResponse.json(
        { error: 'Item stock record not found' },
        { status: 404 }
      );
    }

    // Get the box with location details
    const box = await db.query.boxes.findFirst({
      where: eq(boxes.id, boxId),
      with: {
        location: true // Include location details
      }
    });

    if (!box) {
      return NextResponse.json(
        { error: 'Storage box not found' },
        { status: 404 }
      );
    }

    // Calculate the quantity to move from pending to inStorage
    const quantityToMove = itemRequest.item.stock.pending;
    
    if (quantityToMove <= 0) {
      return NextResponse.json(
        { error: 'No pending stock available to move' },
        { status: 400 }
      );
    }

    // Update the item request to approved
    await db
      .update(itemRequests)
      .set({
        status: 'approved',
        approvedBy: user.id, // Use the verified user ID from the database
        approvedAt: new Date(),
      })
      .where(eq(itemRequests.id, requestId));

    // Update the item status to approved
    await db
      .update(items)
      .set({
        status: 'approved',
        approvedBy: user.id, // Use the verified user ID from the database
        approvedAt: new Date(),
      })
      .where(eq(items.productCode, itemRequest.itemId));

    // Update the item stock:
    // 1. Move stock from pending to inStorage
    // 2. Set the boxId
    // 3. Update timestamps
    await db
      .update(itemStock)
      .set({
        boxId: boxId,
        pending: itemRequest.item.stock.pending - quantityToMove,
        inStorage: itemRequest.item.stock.inStorage + quantityToMove,
        updatedAt: new Date(),
      })
      .where(eq(itemStock.id, itemRequest.item.stock.id));

    // Create a stock movement record
    // Generate a shorter reference ID from the UUID (first 10 characters)
    const shortReferenceId = requestId.substring(0, 10);
    
    await db.insert(stockMovements).values({
      itemId: itemRequest.itemId,
      stockId: itemRequest.item.stock.id,
      movementType: 'borrow', // Using 'borrow' as the movement type for approval
      quantity: quantityToMove,
      fromState: 'pending',
      toState: 'storage',
      referenceId: shortReferenceId, // Use the shortened reference ID
      referenceType: 'borrow_request',
      boxId: boxId,
      performedBy: user.id, // Use the verified user ID from the database
      notes: `Item approved and stored in box ${box.boxNumber}`,
    });

    return NextResponse.json({ 
      message: 'Item approved and stored successfully',
      itemId: itemRequest.itemId,
      boxId: boxId,
      boxNumber: box.boxNumber,
      location: box.location.name, // Now we can access location name
      quantityMoved: quantityToMove,
      status: 'approved'
    });
  } catch (error) {
    console.error('Failed to approve item:', error);
    return NextResponse.json(
      { error: 'Failed to approve item', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
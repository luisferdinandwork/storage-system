// app/api/item-requests/bulk-approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { itemRequests, items, itemStock, stockMovements, boxes, users } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import type { MovementType, StockState } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
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

    const { requestIds, boxId } = await request.json();

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        { error: 'Request IDs are required' },
        { status: 400 }
      );
    }

    if (!boxId) {
      return NextResponse.json(
        { error: 'Storage box is required' },
        { status: 400 }
      );
    }

    // Get the box to verify it exists
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

    // Get all item requests with item and stock details
    const itemRequestsList = await db.query.itemRequests.findMany({
      where: inArray(itemRequests.id, requestIds),
      with: {
        item: {
          with: {
            stock: true
          }
        },
      },
    });

    if (itemRequestsList.length === 0) {
      return NextResponse.json({ error: 'No valid item requests found' }, { status: 404 });
    }

    // Filter out requests that are not pending and have stock
    const pendingRequests = itemRequestsList.filter(req => 
      req.status === 'pending' && req.item.stock
    );
    
    if (pendingRequests.length === 0) {
      return NextResponse.json(
        { error: 'No pending requests with stock found' },
        { status: 400 }
      );
    }

    // Get the IDs of pending requests
    const pendingRequestIds = pendingRequests.map(req => req.id);

    // Update all pending item requests to approved
    await db
      .update(itemRequests)
      .set({
        status: 'approved',
        approvedBy: user.id,
        approvedAt: new Date(),
      })
      .where(inArray(itemRequests.id, pendingRequestIds));

    // Update all items to approved
    const itemIds = pendingRequests.map(req => req.itemId);
    await db
      .update(items)
      .set({
        status: 'approved',
        approvedBy: user.id,
        approvedAt: new Date(),
      })
      .where(inArray(items.productCode, itemIds)); // Use productCode instead of id

    // Prepare stock movement records with proper typing
    const stockMovementRecords: {
      itemId: string;
      stockId: string;
      movementType: MovementType;
      quantity: number;
      fromState: StockState;
      toState: StockState;
      referenceId: string;
      referenceType: 'borrow_request' | 'borrow_request_item' | 'clearance' | 'manual';
      boxId: string;
      performedBy: string;
      notes: string;
    }[] = [];

    // Update each item stock individually and prepare movement records
    for (const request of pendingRequests) {
      if (!request.item.stock) continue;

      const quantityToMove = request.item.stock.pending;
      
      if (quantityToMove <= 0) continue;

      // Update the item stock
      await db
        .update(itemStock)
        .set({
          boxId: boxId,
          pending: request.item.stock.pending - quantityToMove,
          inStorage: request.item.stock.inStorage + quantityToMove,
          updatedAt: new Date(),
        })
        .where(eq(itemStock.id, request.item.stock.id));

      // Prepare stock movement record with proper enum values
      stockMovementRecords.push({
        itemId: request.itemId,
        stockId: request.item.stock.id,
        movementType: 'borrow' as MovementType, // Cast to the enum type
        quantity: quantityToMove,
        fromState: 'pending' as StockState, // Cast to the enum type
        toState: 'storage' as StockState, // Cast to the enum type
        referenceId: request.id.substring(0, 10), // Shorten UUID to 10 chars
        referenceType: 'borrow_request' as const, // Use const assertion for literal type
        boxId: boxId,
        performedBy: user.id,
        notes: `Bulk approved and stored in box ${box.boxNumber}`,
      });
    }

    // Insert all stock movement records in a single batch
    if (stockMovementRecords.length > 0) {
      await db.insert(stockMovements).values(stockMovementRecords);
    }

    return NextResponse.json({ 
      message: `${pendingRequests.length} items approved and stored successfully`,
      approvedCount: pendingRequests.length,
      boxId: boxId,
      boxNumber: box.boxNumber,
      location: box.location.name,
      status: 'approved'
    });
  } catch (error) {
    console.error('Failed to approve items:', error);
    return NextResponse.json(
      { error: 'Failed to approve items', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
// app/api/item-requests/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { itemRequests, items, itemStock, itemImages, borrowRequestItems, itemClearances, stockMovements } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to reject items
    const allowedRoles = ['superadmin', 'storage-master', 'storage-master-manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: requestId } = await params;
    const { reason } = await request.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Get the item request using Drizzle query
    const itemRequest = await db.query.itemRequests.findFirst({
      where: eq(itemRequests.id, requestId),
      with: {
        item: true,
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

    const itemId = itemRequest.itemId;

    // Delete all related records in the correct order to avoid foreign key constraint errors
    // 1. Delete stock movements
    await db.delete(stockMovements)
      .where(eq(stockMovements.itemId, itemId));
    
    // 2. Delete borrow request items
    await db.delete(borrowRequestItems)
      .where(eq(borrowRequestItems.itemId, itemId));
    
    // 3. Delete item clearances
    await db.delete(itemClearances)
      .where(eq(itemClearances.itemId, itemId));
    
    // 4. Delete item images
    await db.delete(itemImages)
      .where(eq(itemImages.itemId, itemId));
    
    // 5. Delete item stock
    await db.delete(itemStock)
      .where(eq(itemStock.itemId, itemId));
    
    // 6. Delete item request
    await db.delete(itemRequests)
      .where(eq(itemRequests.id, requestId));
    
    // 7. Finally, delete the item
    await db.delete(items)
      .where(eq(items.id, itemId));

    return NextResponse.json({ 
      message: 'Item rejected and removed successfully',
      reason: reason
    });
  } catch (error) {
    console.error('Failed to reject and remove item:', error);
    return NextResponse.json(
      { error: 'Failed to reject and remove item' },
      { status: 500 }
    );
  }
}
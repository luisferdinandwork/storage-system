// app/api/items/revert-from-clearance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemStock, itemClearances, stockMovements } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only storage-master, storage-manager, and superadmin can revert items from clearance
    const allowedRoles = ['superadmin', 'storage-master', 'storage-manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { itemId, quantity } = await request.json();

    if (!itemId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Item ID and quantity are required' },
        { status: 400 }
      );
    }

    // Get the current stock
    const stock = await db.query.itemStock.findFirst({
      where: eq(itemStock.itemId, itemId),
    });

    if (!stock) {
      return NextResponse.json({ error: 'Item stock not found' }, { status: 404 });
    }

    if (stock.inClearance < quantity) {
      return NextResponse.json(
        { error: 'Insufficient clearance quantity' },
        { status: 400 }
      );
    }

    // Update the stock - move from inClearance back to inStorage
    const updatedStock = await db
      .update(itemStock)
      .set({
        inClearance: stock.inClearance - quantity,
        inStorage: stock.inStorage + quantity,
        updatedAt: new Date(),
      })
      .where(eq(itemStock.itemId, itemId))
      .returning();

    // Create a clearance record for the revert
    const [clearance] = await db
      .insert(itemClearances)
      .values({
        itemId,
        quantity: -quantity, 
        requestedBy: session.user.id,
        reason: 'Reverted from clearance',
        status: 'completed',
        metadata: {
          previousInClearance: stock.inClearance,
          newInClearance: stock.inClearance - quantity,
        },
      })
      .returning();

    // Record stock movement
    await db.insert(stockMovements).values({
      itemId,
      stockId: updatedStock[0].id,
      movementType: 'clearance',
      quantity: -quantity, 
      fromState: 'clearance',
      toState: 'storage',
      performedBy: session.user.id,
      referenceId: clearance.id,
      referenceType: 'clearance',
      notes: 'Reverted from clearance',
    });

    return NextResponse.json({ 
      message: 'Item reverted from clearance successfully',
      itemId,
      quantity,
    });
  } catch (error) {
    console.error('Failed to revert item from clearance:', error);
    return NextResponse.json(
      { error: 'Failed to revert item from clearance' },
      { status: 500 }
    );
  }
}
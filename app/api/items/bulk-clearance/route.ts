// app/api/items/bulk-clearance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemStock, itemClearances, stockMovements } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// Helper function to generate a short ID
function generateShortId(length = 10) {
  return randomBytes(length)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, length);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only item-master and superadmin can move items to clearance
    const allowedRoles = ['superadmin', 'item-master'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { items: clearanceItems, reason } = await request.json();

    if (!clearanceItems || !Array.isArray(clearanceItems) || clearanceItems.length === 0) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Clearance reason is required' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    // Process each item
    for (const item of clearanceItems) {
      const { itemId, quantity } = item;

      if (!itemId || !quantity || quantity <= 0) {
        errors.push({ itemId, error: 'Invalid item ID or quantity' });
        continue;
      }

      // Get the current stock for the item
      const stock = await db.query.itemStock.findFirst({
        where: eq(itemStock.itemId, itemId),
      });

      if (!stock) {
        errors.push({ itemId, error: 'Item stock not found' });
        continue;
      }

      // Check if there's enough available stock (pending + inStorage)
      const availableStock = stock.pending + stock.inStorage;
      if (availableStock < quantity) {
        errors.push({ 
          itemId, 
          error: `Insufficient stock. Available: ${availableStock}, Requested: ${quantity}` 
        });
        continue;
      }

      // Determine how much to take from pending and inStorage
      let pendingToClear = 0;
      let inStorageToClear = 0;

      if (stock.pending >= quantity) {
        pendingToClear = quantity;
      } else {
        pendingToClear = stock.pending;
        inStorageToClear = quantity - stock.pending;
      }

      // Update item stock
      const updatedStock = await db
        .update(itemStock)
        .set({
          pending: stock.pending - pendingToClear,
          inStorage: stock.inStorage - inStorageToClear,
          inClearance: stock.inClearance + quantity,
          updatedAt: new Date(),
        })
        .where(eq(itemStock.itemId, itemId))
        .returning();

      // Create clearance record
      const [clearance] = await db
        .insert(itemClearances)
        .values({
          itemId,
          quantity,
          requestedBy: session.user.id,
          reason,
          status: 'completed',
          metadata: {
            pendingCleared: pendingToClear,
            inStorageCleared: inStorageToClear,
          },
        })
        .returning();

      // Generate a short reference ID
      const shortReferenceId = generateShortId(10);

      // Record stock movement
      await db.insert(stockMovements).values({
        itemId,
        stockId: updatedStock[0].id,
        movementType: 'clearance',
        quantity,
        fromState: pendingToClear > 0 ? 'pending' : 'storage',
        toState: 'clearance',
        referenceId: shortReferenceId, // Use the short ID
        referenceType: 'clearance',
        performedBy: session.user.id,
        notes: `Moved to clearance: ${reason}`,
      });

      results.push({
        itemId,
        quantity,
        pendingCleared: pendingToClear,
        inStorageCleared: inStorageToClear,
        clearanceId: clearance.id,
        referenceId: shortReferenceId,
      });
    }

    return NextResponse.json({ 
      message: `${results.length} items moved to clearance successfully`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Failed to move items to clearance:', error);
    return NextResponse.json(
      { error: 'Failed to move items to clearance' },
      { status: 500 }
    );
  }
}
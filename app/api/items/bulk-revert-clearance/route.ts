// app/api/items/bulk-revert-clearance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemStock, itemClearances, stockMovements, boxes, locations } from '@/lib/db/schema';
import { eq, inArray, and, isNull } from 'drizzle-orm';
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

    // Only storage-master, storage-master-manager, and superadmin can revert items from clearance
    const allowedRoles = ['superadmin', 'storage-master', 'storage-master-manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { items: revertItems, reason } = await request.json();

    if (!revertItems || !Array.isArray(revertItems) || revertItems.length === 0) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Revert reason is required' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    // Process each item
    for (const item of revertItems) {
      const { itemId, stockId, quantity } = item;

      if (!itemId || !quantity || quantity <= 0) {
        errors.push({ itemId, error: 'Invalid item ID or quantity' });
        continue;
      }

      // Get the current stock for the item
      let stock;
      if (stockId) {
        stock = await db.query.itemStock.findFirst({
          where: and(
            eq(itemStock.id, stockId),
            eq(itemStock.itemId, itemId)
          ),
        });
      } else {
        stock = await db.query.itemStock.findFirst({
          where: eq(itemStock.itemId, itemId),
        });
      }

      if (!stock) {
        errors.push({ itemId, error: 'Item stock not found' });
        continue;
      }

      // Check if there's enough clearance stock
      if (stock.inClearance < quantity) {
        errors.push({ 
          itemId, 
          error: `Insufficient clearance stock. Available: ${stock.inClearance}, Requested: ${quantity}` 
        });
        continue;
      }

      // Update item stock - move from clearance to storage
      const updatedStock = await db
        .update(itemStock)
        .set({
          inClearance: stock.inClearance - quantity,
          inStorage: stock.inStorage + quantity,
          updatedAt: new Date(),
        })
        .where(eq(itemStock.id, stock.id))
        .returning();

      // Get location information for the stock record
      let locationInfo = null;
      if (stock.boxId) {
        locationInfo = await db.query.boxes.findFirst({
          where: eq(boxes.id, stock.boxId),
          with: {
            location: true
          }
        });
      }

      // Create a clearance record for the revert
      // Using 'completed' status since 'reverted' is not in the enum
      const [clearance] = await db
        .insert(itemClearances)
        .values({
          itemId,
          quantity,
          requestedBy: session.user.id,
          reason: `REVERT: ${reason}`, // Prefix to indicate this is a revert
          status: 'completed', // Using 'completed' since 'reverted' is not in the enum
          metadata: {
            type: 'revert', // Adding type in metadata to track this is a revert
            stockId: stock.id,
            boxId: stock.boxId,
            locationId: locationInfo?.location?.id,
            locationName: locationInfo?.location?.name,
            boxNumber: locationInfo?.boxNumber,
          },
        })
        .returning();

      // Generate a short reference ID
      const shortReferenceId = generateShortId(10);

      // Record stock movement
      // Using 'clearance' as referenceType since 'clearance_revert' is not in the enum
      await db.insert(stockMovements).values({
        itemId,
        stockId: updatedStock[0].id,
        movementType: 'adjustment', // Using 'adjustment' since 'revert_clearance' is not in the enum
        quantity,
        fromState: 'clearance',
        toState: 'storage',
        referenceId: shortReferenceId,
        referenceType: 'clearance', // Using 'clearance' which is in the enum
        performedBy: session.user.id,
        notes: `REVERT FROM CLEARANCE: ${reason}`, // Making it clear in notes this is a revert
        boxId: stock.boxId,
      });

      results.push({
        itemId,
        quantity,
        clearanceId: clearance.id,
        referenceId: shortReferenceId,
        stockId: stock.id,
        boxId: stock.boxId,
        locationName: locationInfo?.location?.name,
        boxNumber: locationInfo?.boxNumber,
      });
    }

    return NextResponse.json({ 
      message: `${results.length} items reverted from clearance successfully`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Failed to revert items from clearance:', error);
    return NextResponse.json(
      { error: 'Failed to revert items from clearance' },
      { status: 500 }
    );
  }
}
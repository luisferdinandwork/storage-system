// app/api/items/bulk-clearance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemStock, itemClearances, stockMovements, boxes, locations } from '@/lib/db/schema';
import { eq, inArray, and, isNull, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// Define the enum types to match our schema
type MovementType = 'initial_stock' | 'borrow' | 'complete' | 'clearance' | 'seed' | 'revert_seed' | 'adjustment';
type StockState = 'storage' | 'borrowed' | 'clearance' | 'seeded' | 'none' | 'pending';
type ReferenceType = 'borrow_request' | 'borrow_request_item' | 'clearance' | 'manual';
type ClearanceStatus = 'pending' | 'approved' | 'rejected' | 'completed';

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

      // Get ALL stock records for this item, ordered by available stock
      const allStockRecords = await db
        .select({
          stock: itemStock,
          box: boxes,
          location: locations,
          availableStock: sql`${itemStock.pending} + ${itemStock.inStorage}`.as('available_stock')
        })
        .from(itemStock)
        .leftJoin(boxes, eq(itemStock.boxId, boxes.id))
        .leftJoin(locations, eq(boxes.locationId, locations.id))
        .where(eq(itemStock.itemId, itemId))
        .orderBy(sql`available_stock DESC`); // Prioritize stock with more available quantity

      if (!allStockRecords || allStockRecords.length === 0) {
        errors.push({ itemId, error: 'No stock records found for this item' });
        continue;
      }

      // Calculate total available stock across all locations
      const totalAvailableStock = allStockRecords.reduce(
        (total, record) => total + (record.stock.pending + record.stock.inStorage),
        0
      );

      if (totalAvailableStock < quantity) {
        errors.push({ 
          itemId, 
          error: `Insufficient stock. Available: ${totalAvailableStock}, Requested: ${quantity}` 
        });
        continue;
      }

      // Distribute the clearance quantity across available stock records
      let remainingQuantity = quantity;
      const updatedStockRecords = [];
      const stockMovementsData: {
        itemId: string;
        stockId: string;
        movementType: MovementType;
        quantity: number;
        fromState: StockState;
        toState: StockState;
        referenceId: string;
        referenceType: ReferenceType;
        performedBy: string;
        notes: string;
        boxId: string | null;
      }[] = [];
      const clearedFromLocations = [];

      for (const record of allStockRecords) {
        if (remainingQuantity <= 0) break;

        const { stock, box, location } = record;
        const availableInRecord = stock.pending + stock.inStorage;
        
        if (availableInRecord <= 0) continue;

        // Determine how much to clear from this record
        const quantityToClear = Math.min(remainingQuantity, availableInRecord);
        
        // Determine how much to take from pending and inStorage in this record
        let pendingToClear = 0;
        let inStorageToClear = 0;

        if (stock.pending >= quantityToClear) {
          pendingToClear = quantityToClear;
        } else {
          pendingToClear = stock.pending;
          inStorageToClear = quantityToClear - stock.pending;
        }

        // Update this stock record
        const updatedStock = await db
          .update(itemStock)
          .set({
            pending: stock.pending - pendingToClear,
            inStorage: stock.inStorage - inStorageToClear,
            inClearance: stock.inClearance + quantityToClear,
            updatedAt: new Date(),
          })
          .where(eq(itemStock.id, stock.id))
          .returning();

        updatedStockRecords.push(updatedStock[0]);
        
        // Record stock movement for this specific stock record
        const shortReferenceId = generateShortId(10);
        stockMovementsData.push({
          itemId: itemId,
          stockId: stock.id,
          movementType: 'clearance', 
          quantity: quantityToClear,
          fromState: pendingToClear > 0 ? 'pending' : 'storage',
          toState: 'clearance', 
          referenceId: shortReferenceId,
          referenceType: 'clearance',
          performedBy: session.user.id,
          notes: `Moved to clearance: ${reason}`,
          boxId: stock.boxId,
        });

        // Track location information for reporting
        clearedFromLocations.push({
          stockId: stock.id,
          boxId: stock.boxId,
          boxNumber: box?.boxNumber,
          locationId: location?.id,
          locationName: location?.name,
          quantityCleared: quantityToClear,
          pendingCleared: pendingToClear,
          inStorageCleared: inStorageToClear,
        });

        remainingQuantity -= quantityToClear;
      }

      // Create a single clearance record for the item with the total quantity
      const [clearance] = await db
        .insert(itemClearances)
        .values({
          itemId,
          quantity,
          requestedBy: session.user.id,
          reason,
          status: 'completed',
          metadata: {
            clearedFromLocations,
            totalPendingCleared: clearedFromLocations.reduce((sum, loc) => sum + loc.pendingCleared, 0),
            totalInStorageCleared: clearedFromLocations.reduce((sum, loc) => sum + loc.inStorageCleared, 0),
          },
        })
        .returning();

      // Insert all stock movement records
      await db.insert(stockMovements).values(stockMovementsData);

      results.push({
        itemId,
        quantity,
        clearanceId: clearance.id,
        clearedFromLocations,
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
      { error: 'Failed to move items to clearance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
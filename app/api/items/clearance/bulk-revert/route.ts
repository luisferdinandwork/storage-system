// app/api/items/clearance/bulk-revert/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemStock, itemClearances, users } from '@/lib/db/schema';
import { eq, and, isNotNull, gt, inArray, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user permissions
    const userRole = session.user.role;
    const isStorageMaster = userRole === 'storage-master';
    const isSuperAdmin = userRole === 'superadmin';
    const isStorageManager = userRole === 'storage-manager';
    const canManageClearance = isStorageMaster || isSuperAdmin || isStorageManager;

    if (!canManageClearance) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { itemIds } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'No item IDs provided' }, { status: 400 });
    }

    // Check which items actually exist before attempting to revert
    const existingItems = await db
      .select({ id: items.id })
      .from(items)
      .where(inArray(items.id, itemIds));
    
    const existingItemIds = existingItems.map(item => item.id);
    const nonExistingItemIds = itemIds.filter(id => !existingItemIds.includes(id));
    
    if (existingItemIds.length === 0) {
      return NextResponse.json({ 
        error: 'None of the provided item IDs exist',
        nonExistingItemIds 
      }, { status: 404 });
    }

    // Get all clearance records for the selected items
    const clearanceRecords = await db
      .select({
        id: itemClearances.id,
        itemId: itemClearances.itemId,
        quantity: itemClearances.quantity,
        stockId: itemStock.id,
        currentInClearance: itemStock.inClearance,
        currentInStorage: itemStock.inStorage,
      })
      .from(itemClearances)
      .leftJoin(itemStock, eq(itemClearances.itemId, itemStock.itemId))
      .where(inArray(itemClearances.itemId, existingItemIds));

    // Group by itemId to calculate total quantity to revert
    const quantitiesToRevert: Record<string, { quantity: number; stockId: string }> = {};
    
    clearanceRecords.forEach(record => {
      if (!quantitiesToRevert[record.itemId]) {
        quantitiesToRevert[record.itemId] = {
          quantity: 0,
          stockId: record.stockId || ''
        };
      }
      quantitiesToRevert[record.itemId].quantity += record.quantity;
    });

    // Update stock for each item
    const stockUpdateResults = [];
    for (const [itemId, data] of Object.entries(quantitiesToRevert)) {
      if (!data.stockId) continue;
      
      try {
        const stock = await db.query.itemStock.findFirst({
          where: eq(itemStock.id, data.stockId)
        });

        if (stock) {
          const updatedStock = await db.update(itemStock)
            .set({
              inClearance: Math.max(0, stock.inClearance - data.quantity),
              inStorage: stock.inStorage + data.quantity,
              updatedAt: new Date()
            })
            .where(eq(itemStock.id, data.stockId))
            .returning();
          
          stockUpdateResults.push({ itemId, success: true, updatedStock });
        }
      } catch (error) {
        console.error(`Failed to update stock for item ${itemId}:`, error);
        stockUpdateResults.push({ itemId, success: false, error });
      }
    }

    // Delete all clearance records for the selected items
    try {
      const deletedClearances = await db.delete(itemClearances)
        .where(inArray(itemClearances.itemId, existingItemIds))
        .returning({ id: itemClearances.id });

      return NextResponse.json({ 
        message: `${existingItemIds.length} items reverted from clearance successfully`,
        revertedCount: existingItemIds.length,
        nonExistingItemIds: nonExistingItemIds.length > 0 ? nonExistingItemIds : undefined,
        stockUpdateResults
      });
    } catch (error) {
      console.error('Failed to delete clearance records:', error);
      return NextResponse.json({ 
        error: 'Failed to revert items from clearance',
        details: error instanceof Error ? error.message : 'Unknown error',
        stockUpdateResults
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error reverting items from clearance:', error);
    return NextResponse.json({ 
      error: 'Failed to revert items from clearance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
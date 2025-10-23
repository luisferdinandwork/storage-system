// app/api/items/bulk-delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemStock, itemImages, itemRequests, borrowRequestItems, itemClearances, stockMovements } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmin can bulk delete items
    if (session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { itemIds } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'No item IDs provided' }, { status: 400 });
    }

    // Delete all related records in the correct order to avoid foreign key constraint errors
    // 1. Delete stock movements
    await db.delete(stockMovements)
      .where(inArray(stockMovements.itemId, itemIds));
    
    // 2. Delete borrow request items
    await db.delete(borrowRequestItems)
      .where(inArray(borrowRequestItems.itemId, itemIds));
    
    // 3. Delete item clearances
    await db.delete(itemClearances)
      .where(inArray(itemClearances.itemId, itemIds));
    
    // 4. Delete item requests
    await db.delete(itemRequests)
      .where(inArray(itemRequests.itemId, itemIds));
    
    // 5. Delete item images
    await db.delete(itemImages)
      .where(inArray(itemImages.itemId, itemIds));
    
    // 6. Delete item stock
    await db.delete(itemStock)
      .where(inArray(itemStock.itemId, itemIds));
    
    // 7. Finally, delete the items
    const deletedItems = await db.delete(items)
      .where(inArray(items.id, itemIds))
      .returning({ id: items.id });

    return NextResponse.json({ 
      message: `${deletedItems.length} items deleted successfully`,
      deletedCount: deletedItems.length
    });
  } catch (error) {
    console.error('Error bulk deleting items:', error);
    return NextResponse.json({ 
      error: 'Failed to delete items',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
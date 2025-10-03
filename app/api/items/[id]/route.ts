import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemSizes, users, borrowRequests, itemRemovals } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

// GET handler to fetch a single item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get the item with its sizes
    const itemData = await db.select({
      id: items.id,
      name: items.name,
      description: items.description,
      category: items.category,
      addedBy: items.addedBy,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
      addedByUser: {
        id: users.id,
        name: users.name,
      },
    })
    .from(items)
    .leftJoin(users, eq(items.addedBy, users.id))
    .where(eq(items.id, id))
    .limit(1);
    
    if (!itemData.length) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get the sizes for this item
    const itemSizesData = await db.select().from(itemSizes).where(eq(itemSizes.itemId, id));

    // Return the complete item with sizes
    return NextResponse.json({
      ...itemData[0],
      sizes: itemSizesData.map(size => ({
        id: size.id,
        size: size.size,
        quantity: size.quantity,
        available: size.available,
      })),
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }
}

// PUT handler to update an item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, description, category, sizes } = await request.json();
    
    if (!name || !category || !sizes || !Array.isArray(sizes) || sizes.length === 0) {
      return NextResponse.json({ error: 'Name, category, and at least one size are required' }, { status: 400 });
    }

    // Validate each size entry
    for (const sizeEntry of sizes) {
      if (!sizeEntry.size || !sizeEntry.quantity || parseInt(sizeEntry.quantity) <= 0) {
        return NextResponse.json({ error: 'Each size must have a size name and a positive quantity' }, { status: 400 });
      }
    }

    // Check if item exists
    const existingItem = await db.select().from(items).where(eq(items.id, id)).limit(1);
    if (!existingItem.length) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Update the item
    await db.update(items)
      .set({
        name,
        description: description || null,
        category,
        updatedAt: new Date(),
      })
      .where(eq(items.id, id));

    // Get existing sizes
    const existingSizes = await db.select().from(itemSizes).where(eq(itemSizes.itemId, id));
    
    // Get IDs of sizes to keep
    const newSizeIds = sizes.filter((s: any) => s.id).map((s: any) => s.id);
    
    // Find sizes to delete (those that exist in DB but not in the new list)
    const sizesToDelete = existingSizes.filter(size => !newSizeIds.includes(size.id));
    
    if (sizesToDelete.length > 0) {
      const sizeIdsToDelete = sizesToDelete.map(s => s.id);
      await db.delete(itemSizes).where(
        and(
          eq(itemSizes.itemId, id),
          inArray(itemSizes.id, sizeIdsToDelete)
        )
      );
    }

    // Update or create sizes
    for (const sizeEntry of sizes) {
      if (sizeEntry.id) {
        // Update existing size
        const existingSize = existingSizes.find(s => s.id === sizeEntry.id);
        if (existingSize) {
          const newQuantity = parseInt(sizeEntry.quantity);
          const quantityDiff = newQuantity - existingSize.quantity;
          
          await db.update(itemSizes)
            .set({
              size: sizeEntry.size,
              quantity: newQuantity,
              // Adjust available quantity based on the difference, but not below zero
              available: Math.max(0, existingSize.available + quantityDiff),
            })
            .where(eq(itemSizes.id, sizeEntry.id));
        }
      } else {
        // Create new size
        await db.insert(itemSizes).values({
          itemId: id,
          size: sizeEntry.size,
          quantity: parseInt(sizeEntry.quantity),
          available: parseInt(sizeEntry.quantity),
        });
      }
    }

    // Get the updated item with sizes to return
    const updatedItem = await db.select({
      id: items.id,
      name: items.name,
      description: items.description,
      category: items.category,
      addedBy: items.addedBy,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
      addedByUser: {
        id: users.id,
        name: users.name,
      },
    })
    .from(items)
    .leftJoin(users, eq(items.addedBy, users.id))
    .where(eq(items.id, id))
    .limit(1);

    const updatedSizes = await db.select().from(itemSizes).where(eq(itemSizes.itemId, id));

    return NextResponse.json({
      ...updatedItem[0],
      sizes: updatedSizes.map(size => ({
        id: size.id,
        size: size.size,
        quantity: size.quantity,
        available: size.available,
      })),
    });
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// DELETE handler 
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { reason } = await request.json();
    
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Reason is required for item removal' }, { status: 400 });
    }

    // Check if item exists
    const existingItem = await db.select().from(items).where(eq(items.id, id)).limit(1);
    if (!existingItem.length) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get all sizes for this item
    const itemSizesData = await db.select().from(itemSizes).where(eq(itemSizes.itemId, id));
    
    if (itemSizesData.length === 0) {
      return NextResponse.json({ error: 'No sizes found for this item' }, { status: 404 });
    }

    // Check if any sizes have active borrow requests
    const sizeIds = itemSizesData.map(s => s.id);
    const activeRequests = await db.select()
      .from(borrowRequests)
      .where(and(
        inArray(borrowRequests.itemSizeId, sizeIds),
        eq(borrowRequests.status, 'approved')
      ))
      .limit(1);

    if (activeRequests.length > 0) {
      return NextResponse.json({ error: 'Cannot delete item with active borrow requests' }, { status: 400 });
    }

    // Record the removal for each size
    for (const size of itemSizesData) {
      await db.insert(itemRemovals).values({
        itemSizeId: size.id,
        removedBy: session.user.id,
        quantityRemoved: size.quantity,
        reason: reason.trim(),
      });
    }

    // Delete in correct order: item_removals -> item_sizes -> items
    // 1. Delete item_removals records first (we just created them)
    await db.delete(itemRemovals).where(inArray(itemRemovals.itemSizeId, sizeIds));
    
    // 2. Delete item_sizes
    await db.delete(itemSizes).where(eq(itemSizes.itemId, id));
    
    // 3. Delete the item
    await db.delete(items).where(eq(items.id, id));

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
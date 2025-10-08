// app/api/items/bulk-unarchive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemArchives } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { itemIds, reason } = await request.json();
    
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'Item IDs are required' }, { status: 400 });
    }
    
    if (!reason || reason.trim() === '') {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }
    
    // Update all items status to active
    const updatedItems = await db
      .update(items)
      .set({ 
        status: 'active',
        updatedAt: new Date()
      })
      .where(inArray(items.id, itemIds))
      .returning();
    
    // Create archive records for each unarchived item
    const archiveRecords = updatedItems.map(item => ({
      itemId: item.id,
      archivedBy: session.user.id,
      reason: reason.trim(),
      archivedInventory: item.inventory,
      archivedCondition: item.condition,
      archivedConditionNotes: item.conditionNotes,
      archivedImages: JSON.stringify([]), // You might want to fetch the actual images
      metadata: JSON.stringify(item),
    }));
    
    await db.insert(itemArchives).values(archiveRecords);
    
    return NextResponse.json({ 
      message: 'Items unarchived successfully', 
      unarchivedItems: itemIds,
      count: updatedItems.length 
    });
  } catch (error) {
    console.error('Failed to bulk unarchive items:', error);
    return NextResponse.json({ error: 'Failed to bulk unarchive items' }, { status: 500 });
  }
}
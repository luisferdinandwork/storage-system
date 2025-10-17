import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db/schema/index';
import { itemClearances, items, borrowRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmins can revert seeding decisions
    if (session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only superadmins can revert seeding decisions' }, { status: 401 });
    }

    const { id } = await params;
    const { reason, restoreQuantity } = await request.json();
    
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }
    
    // Check if clearance record exists
    const clearanceData = await db.select({
      id: itemClearances.id,
      itemId: itemClearances.itemId,
      metadata: itemClearances.metadata,
    })
    .from(itemClearances)
    .where(eq(itemClearances.id, id))
    .limit(1);
    
    if (!clearanceData.length) {
      return NextResponse.json({ error: 'Clearance record not found' }, { status: 404 });
    }
    
    const clearance = clearanceData[0];
    const metadata = clearance.metadata as any;
    
    if (metadata.type !== 'seeding') {
      return NextResponse.json({ error: 'This is not a seeding record' }, { status: 400 });
    }
    
    // Get the item
    const itemData = await db.select({
      id: items.id,
      inventory: items.inventory,
      status: items.status,
    })
    .from(items)
    .where(eq(items.id, clearance.itemId))
    .limit(1);
    
    if (!itemData.length) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    
    const item = itemData[0];
    
    // Update item status back to available
    await db.update(items)
      .set({
        status: 'available',
        // Restore inventory if requested
        inventory: restoreQuantity 
          ? sql`${items.inventory} + ${metadata.originalQuantity || 0}`
          : item.inventory,
      })
      .where(eq(items.id, clearance.itemId));
    
    // Update the related borrow request if it exists
    if (metadata.borrowRequestId) {
      await db.update(borrowRequests)
        .set({
          status: 'active',
          // notes: `Seeding decision reverted on ${new Date().toISOString()}. Reason: ${reason.trim()}`,
        })
        .where(eq(borrowRequests.id, metadata.borrowRequestId));
    }
    
    // Update clearance record
    // await db.update(itemClearances)
    //   .set({
    //     status: 'reverted',
    //     metadata: {
    //       ...metadata,
    //       revertedBy: session.user.id,
    //       revertedAt: new Date(),
    //       revertReason: reason.trim(),
    //       restoreQuantity,
    //     },
    //   })
    //   .where(eq(itemClearances.id, id));
    
    return NextResponse.json({
      message: 'Seeding decision reverted successfully',
      itemStatus: 'available',
      inventoryRestored: restoreQuantity,
    });
  } catch (error) {
    console.error('Error reverting seeding:', error);
    return NextResponse.json({ error: 'Failed to revert seeding decision' }, { status: 500 });
  }
}
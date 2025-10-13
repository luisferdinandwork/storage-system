import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests, itemClearances, items, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only storage masters and superadmins can mark items as seeded
    const isStorageMaster = session.user.role === 'storage-master' || session.user.role === 'storage-master-manager';
    const isSuperAdmin = session.user.role === 'superadmin';
    
    if (!isStorageMaster && !isSuperAdmin) {
      return NextResponse.json({ error: 'Only storage masters can mark items as seeded' }, { status: 401 });
    }

    const { id } = await params;
    const { reason, notes, estimatedValue } = await request.json();
    
    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }
    
    // Check if request exists
    const requestData = await db.select({
      id: borrowRequests.id,
      itemId: borrowRequests.itemId,
      userId: borrowRequests.userId,
      quantity: borrowRequests.quantity,
      status: borrowRequests.status,
      item: {
        id: items.id,
        productCode: items.productCode,
        description: items.description,
        inventory: items.inventory,
        location: items.location,
      },
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(borrowRequests)
    .leftJoin(items, eq(borrowRequests.itemId, items.id))
    .leftJoin(users, eq(borrowRequests.userId, users.id))
    .where(eq(borrowRequests.id, id))
    .limit(1);
    
    if (!requestData.length) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    const borrowRequest = requestData[0];
    
    if (borrowRequest.status !== 'active' && borrowRequest.status !== 'overdue') {
      return NextResponse.json({ error: 'Request must be active or overdue to be marked as seeded' }, { status: 400 });
    }
    
    // Check if item is already in clearance
    const existingClearance = await db.select()
      .from(itemClearances)
      .where(eq(itemClearances.itemId, borrowRequest.itemId))
      .limit(1);
    
    if (existingClearance.length > 0) {
      return NextResponse.json({ error: 'Item is already in clearance' }, { status: 400 });
    }
    
    // Create item clearance record
    const clearanceRecord = await db.insert(itemClearances).values({
      itemId: borrowRequest.itemId,
      requestedBy: session.user.id,
      reason: reason.trim(),
      status: 'approved',
      approvedBy: session.user.id,
      approvedAt: new Date(),
      clearedAt: new Date(),
      metadata: {
        type: 'seeding',
        borrowRequestId: id,
        originalQuantity: borrowRequest.quantity,
        estimatedValue: estimatedValue || null,
        seededBy: session.user.id,
        seededAt: new Date(),
        notes: notes || null,
        user: {
          id: borrowRequest.user?.id,
          name: borrowRequest.user?.name,
          email: borrowRequest.user?.email,
        },
        item: {
          id: borrowRequest.item?.id,
          productCode: borrowRequest.item?.productCode,
          description: borrowRequest.item?.description,
        },
      },
    }).returning();
    
    // Update item status to in_clearance
    await db.update(items)
      .set({
        status: 'in_clearance',
        // Optionally remove from inventory count
        inventory: borrowRequest.item?.inventory ? borrowRequest.item.inventory - borrowRequest.quantity : 0,
      })
      .where(eq(items.id, borrowRequest.itemId));
    
    // Update borrow request status
    await db.update(borrowRequests)
      .set({
        status: 'seeded',
        // Store seeding information in notes
        // notes: `Item marked as seeded on ${new Date().toISOString()}. Reason: ${reason.trim()}${notes ? `. Notes: ${notes}` : ''}`,
      })
      .where(eq(borrowRequests.id, id));
    
    return NextResponse.json({
      message: 'Item marked as seeded and moved to clearance',
      clearance: clearanceRecord[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error seeding item:', error);
    return NextResponse.json({ error: 'Failed to seed item' }, { status: 500 });
  }
}
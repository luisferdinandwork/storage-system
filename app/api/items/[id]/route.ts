import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemImages as itemImagesTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// PUT /api/items/[id] - Update a specific item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedRoles = ['superadmin', 'item-master'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: itemId } = await params;
    const body = await request.json();
    const { 
      productCode, description, brandCode, productGroup, productDivision, 
      productCategory, inventory, vendor, period, season, gender, mould, 
      tier, silo, unitOfMeasure, condition, conditionNotes, images 
    } = body;

    if (!productCode || !description || !brandCode || !productGroup || !productDivision || 
        !productCategory || !vendor || !period || !season || !gender || !mould || !tier || 
        !silo || !unitOfMeasure || !condition) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get current item using Drizzle ORM
    const currentItem = await db.query.items.findFirst({
      where: eq(items.id, itemId),
    });

    if (!currentItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (session.user.role === 'item-master' && currentItem.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Item masters can only edit items with "Pending Approval" status' },
        { status: 400 }
      );
    }

    // Update the item
    const [updatedItem] = await db
      .update(items)
      .set({
        productCode, description, brandCode, productGroup, productDivision,
        productCategory, inventory: inventory || 0, vendor, period, season,
        gender, mould, tier, silo, unitOfMeasure, condition,
        conditionNotes: conditionNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(items.id, itemId))
      .returning();

    // Delete existing images
    await db.delete(itemImagesTable).where(eq(itemImagesTable.itemId, itemId));

    // Create new images if provided
    let newImages: any[] = [];
    if (images && images.length > 0) {
      const imagesToInsert = images.map((image: any, index: number) => ({
        itemId: updatedItem.id,
        fileName: image.fileName,
        originalName: image.originalName,
        mimeType: image.mimeType,
        size: image.size,
        altText: image.altText || `${description} - Image ${index + 1}`,
        isPrimary: image.isPrimary || index === 0,
      }));

      newImages = await db.insert(itemImagesTable).values(imagesToInsert).returning();
    }

    return NextResponse.json({ ...updatedItem, images: newImages });
  } catch (error) {
    console.error('Failed to update item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// DELETE /api/items/[id] - Delete a specific item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: itemId } = await params;

    // Get the item using Drizzle ORM
    const itemToDelete = await db.query.items.findFirst({
      where: eq(items.id, itemId),
      with: {
        images: true,
      },
    });

    if (!itemToDelete) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Delete the item images from database
    await db.delete(itemImagesTable).where(eq(itemImagesTable.itemId, itemId));

    // Delete the item
    await db.delete(items).where(eq(items.id, itemId));

    return NextResponse.json({ 
      message: 'Item deleted successfully',
      deletedItem: itemToDelete
    });
  } catch (error) {
    console.error('Failed to delete item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
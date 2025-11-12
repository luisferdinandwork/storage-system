import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemImages as itemImagesTable, itemStock, boxes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import { join } from 'path';

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

    const { id: productCode } = await params;
    const body = await request.json();
    const { 
      description, 
      period, 
      season, 
      unitOfMeasure, 
      condition, 
      conditionNotes, 
      boxId, // Changed from location to boxId
      images 
    } = body;

    if (!description || !period || !season || !unitOfMeasure) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get current item with images using Drizzle ORM
    const currentItem = await db.query.items.findFirst({
      where: eq(items.productCode, productCode),
      with: {
        images: true,
      },
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

    // Parse product code to extract auto-generated fields (in case it changed)
    const { parseProductCode } = await import('@/lib/db/schema');
    const parsed = parseProductCode(productCode);
    
    if (!parsed.isValid) {
      return NextResponse.json(
        { error: `Invalid product code: ${parsed.error}` },
        { status: 400 }
      );
    }

    // Delete old image files from filesystem if new images are provided
    const deletionErrors: string[] = [];
    
    if (images && images.length > 0 && currentItem.images && currentItem.images.length > 0) {
      for (const image of currentItem.images) {
        try {
          const imagePath = join(process.cwd(), 'public', 'uploads', image.fileName);
          await unlink(imagePath);
          console.log(`Successfully deleted old image file: ${image.fileName}`);
        } catch (error) {
          console.error(`Failed to delete old image file ${image.fileName}:`, error);
          deletionErrors.push(image.fileName);
          // Continue with update even if file removal fails
        }
      }
    }

    // Update the item (note: productCode can't be changed as it's the primary key)
    const [updatedItem] = await db
      .update(items)
      .set({
        description,
        brandCode: parsed.brandCode,
        productDivision: parsed.productDivision,
        productCategory: parsed.productCategory,
        period,
        season,
        unitOfMeasure,
        updatedAt: new Date(),
      })
      .where(eq(items.productCode, productCode))
      .returning();

    // Update the stock record
    const [updatedStock] = await db
      .update(itemStock)
      .set({
        boxId: boxId || null, // Updated to use boxId instead of location
        condition: condition || 'good',
        conditionNotes: conditionNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(itemStock.itemId, productCode))
      .returning();

    // Delete existing image records from database
    await db.delete(itemImagesTable).where(eq(itemImagesTable.itemId, productCode));

    // Create new images if provided
    let newImages: any[] = [];
    if (images && images.length > 0) {
      const imagesToInsert = images.map((image: any, index: number) => ({
        itemId: productCode, // Using productCode as reference
        fileName: image.fileName,
        originalName: image.originalName,
        mimeType: image.mimeType,
        size: image.size,
        altText: image.altText || `${description} - Image ${index + 1}`,
        isPrimary: image.isPrimary || index === 0,
      }));

      newImages = await db.insert(itemImagesTable).values(imagesToInsert).returning();
    }

    // Calculate total stock
    const totalStock = updatedStock ? 
      updatedStock.pending + updatedStock.inStorage + 
      updatedStock.onBorrow + updatedStock.inClearance + 
      updatedStock.seeded : 0;

    const response: any = { 
      ...updatedItem, 
      images: newImages,
      stock: updatedStock, 
      totalStock, // Include calculated total stock
    };

    // Include warning if some old files couldn't be deleted
    if (deletionErrors.length > 0) {
      response.warning = `Item updated but ${deletionErrors.length} old image file(s) could not be removed from filesystem`;
      response.failedFiles = deletionErrors;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to update item:', error);
    return NextResponse.json({ 
      error: 'Failed to update item',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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

    const { id: productCode } = await params;

    // Get the item with images using Drizzle ORM
    const itemToDelete = await db.query.items.findFirst({
      where: eq(items.productCode, productCode),
      with: {
        images: true,
      },
    });

    if (!itemToDelete) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Delete image files from the filesystem
    const deletionErrors: string[] = [];
    
    if (itemToDelete.images && itemToDelete.images.length > 0) {
      for (const image of itemToDelete.images) {
        try {
          const imagePath = join(process.cwd(), 'public', 'uploads', image.fileName);
          await unlink(imagePath);
          console.log(`Successfully deleted image file: ${image.fileName}`);
        } catch (error) {
          console.error(`Failed to delete image file ${image.fileName}:`, error);
          deletionErrors.push(image.fileName);
          // Continue with deletion even if file removal fails
        }
      }
    }

    // Delete the item images from database
    await db.delete(itemImagesTable).where(eq(itemImagesTable.itemId, productCode));

    // Delete the item (this will cascade delete the stock record due to foreign key constraint)
    await db.delete(items).where(eq(items.productCode, productCode));

    const response: any = { 
      message: 'Item deleted successfully',
      deletedItem: {
        productCode: itemToDelete.productCode,
        description: itemToDelete.description,
        imagesDeleted: itemToDelete.images?.length || 0,
      }
    };

    // Include warning if some files couldn't be deleted
    if (deletionErrors.length > 0) {
      response.warning = `Item deleted but ${deletionErrors.length} image file(s) could not be removed from filesystem`;
      response.failedFiles = deletionErrors;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to delete item:', error);
    return NextResponse.json({ 
      error: 'Failed to delete item',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
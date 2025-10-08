import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemImages as itemImagesTable, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir, rename } from 'fs/promises';
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

    // Only admins can update items
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: itemId } = await params;
    const body = await request.json();
    const { 
      productCode, 
      description, 
      brandCode, 
      productGroup, 
      productDivision, 
      productCategory, 
      inventory, 
      vendor, 
      period, 
      season, 
      gender, 
      mould, 
      tier, 
      silo,
      location,
      unitOfMeasure,
      condition,
      conditionNotes,
      status, // Added status field
      images 
    } = body;

    // Validate required fields
    if (!productCode || !description || !brandCode || !productGroup || !productDivision || 
        !productCategory || !vendor || !period || !season || !gender || !mould || !tier || !silo || 
        !location || !unitOfMeasure || !condition) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update the item
    const [updatedItem] = await db
      .update(items)
      .set({
        productCode,
        description,
        brandCode,
        productGroup,
        productDivision,
        productCategory,
        inventory: inventory || 0,
        vendor,
        period,
        season,
        gender,
        mould,
        tier,
        silo,
        location,
        unitOfMeasure,
        condition,
        conditionNotes: conditionNotes || null,
        status: status || 'active', // Added status field with default
        updatedAt: new Date(),
      })
      .where(eq(items.id, itemId))
      .returning();

    if (!updatedItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get existing images before deletion
    const existingImages = await db
      .select()
      .from(itemImagesTable)
      .where(eq(itemImagesTable.itemId, itemId));

    // Move existing images to deleted directory
    for (const image of existingImages) {
      try {
        const sourcePath = join(process.cwd(), 'public', 'uploads', image.fileName);
        const deletedDir = join(process.cwd(), 'public', 'deleted');
        
        // Ensure deleted directory exists
        await mkdir(deletedDir, { recursive: true });
        
        const destPath = join(deletedDir, image.fileName);
        
        // Check if source file exists before trying to move it
        try {
          await writeFile(sourcePath, Buffer.from(''), { flag: 'r' });
          console.log(`Source file exists: ${sourcePath}`);
          
          // Move the file
          await rename(sourcePath, destPath);
          console.log(`Moved deleted image: ${image.fileName}`);
        } catch (checkError) {
          console.log(`Source file does not exist: ${sourcePath}`);
          console.log(`Error checking file:`, checkError);
        }
      } catch (error) {
        console.error(`Failed to move deleted image: ${image.fileName}`, error);
      }
    }

    // Delete existing images from database
    await db.delete(itemImagesTable).where(eq(itemImagesTable.itemId, itemId));

    // Create new images if provided
    let newImages: { id: string; createdAt: Date; itemId: string; fileName: string; originalName: string; mimeType: string; size: number; altText: string | null; isPrimary: boolean; }[] = [];
    if (images && images.length > 0) {
      const imagesToInsert = images.map((image: { fileName: string; originalName: string; mimeType: string; size: number; altText?: string; isPrimary?: boolean }, index: number) => ({
        itemId: updatedItem.id,
        fileName: image.fileName,
        originalName: image.originalName,
        mimeType: image.mimeType,
        size: image.size,
        altText: image.altText || `${description} - Image ${index + 1}`,
        isPrimary: image.isPrimary || index === 0, // First image is primary by default
      }));

      newImages = await db
        .insert(itemImagesTable)
        .values(imagesToInsert)
        .returning();
    }

    return NextResponse.json({
      ...updatedItem,
      images: newImages,
    });
  } catch (error) {
    console.error('Failed to update item:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
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

    // Only admins can delete items
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: itemId } = await params;
    const { reason } = await request.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Reason is required for deletion' },
        { status: 400 }
      );
    }

    // Get the item to delete
    const [itemToDelete] = await db
      .select()
      .from(items)
      .where(eq(items.id, itemId));

    if (!itemToDelete) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get item images before deletion
    const imagesToDelete = await db
      .select()
      .from(itemImagesTable)
      .where(eq(itemImagesTable.itemId, itemId));

    // Move images to deleted directory
    for (const image of imagesToDelete) {
      try {
        const sourcePath = join(process.cwd(), 'public', 'uploads', image.fileName);
        const deletedDir = join(process.cwd(), 'public', 'deleted');
        
        // Ensure deleted directory exists
        await mkdir(deletedDir, { recursive: true });
        
        const destPath = join(deletedDir, image.fileName);
        
        // Check if source file exists before trying to move it
        try {
          await writeFile(sourcePath, Buffer.from(''), { flag: 'r' });
          console.log(`Source file exists: ${sourcePath}`);
          
          // Move the file
          await rename(sourcePath, destPath);
          console.log(`Moved deleted image: ${image.fileName}`);
        } catch (checkError) {
          console.log(`Source file does not exist: ${sourcePath}`);
          console.log(`Error checking file:`, checkError);
        }
      } catch (error) {
        console.error(`Failed to move deleted image: ${image.fileName}`, error);
      }
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
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
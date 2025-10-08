import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemImages as itemImagesTable, itemArchives, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir, rename } from 'fs/promises';
import { join } from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can archive items
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: itemId } = await params;
    const { reason } = await request.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Reason is required for archiving' },
        { status: 400 }
      );
    }

    // Get the item to archive
    const [itemToArchive] = await db
      .select({
        id: items.id,
        productCode: items.productCode,
        description: items.description,
        brandCode: items.brandCode,
        productGroup: items.productGroup,
        productDivision: items.productDivision,
        productCategory: items.productCategory,
        inventory: items.inventory,
        vendor: items.vendor,
        period: items.period,
        season: items.season,
        gender: items.gender,
        mould: items.mould,
        tier: items.tier,
        silo: items.silo,
        location: items.location,
        unitOfMeasure: items.unitOfMeasure,
        condition: items.condition,
        conditionNotes: items.conditionNotes,
        status: items.status,
        createdBy: items.createdBy,
        createdAt: items.createdAt,
        updatedAt: items.updatedAt,
        createdByUser: {
          id: users.id,
          name: users.name,
        },
      })
      .from(items)
      .leftJoin(users, eq(items.createdBy, users.id))
      .where(eq(items.id, itemId));

    if (!itemToArchive) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get item images before archiving
    const imagesToArchive = await db
      .select()
      .from(itemImagesTable)
      .where(eq(itemImagesTable.itemId, itemId));

    // Move images to archived directory
    const archivedImages = [];
    for (const image of imagesToArchive) {
      try {
        const sourcePath = join(process.cwd(), 'public', 'uploads', image.fileName);
        const archivedDir = join(process.cwd(), 'public', 'archived');
        
        // Ensure archived directory exists
        await mkdir(archivedDir, { recursive: true });
        
        const destPath = join(archivedDir, image.fileName);
        
        // Check if source file exists before trying to move it
        try {
          await writeFile(sourcePath, Buffer.from(''), { flag: 'r' });
          console.log(`Source file exists: ${sourcePath}`);
          
          // Move the file
          await rename(sourcePath, destPath);
          console.log(`Moved archived image: ${image.fileName}`);
          
          archivedImages.push({
            id: image.id,
            fileName: image.fileName,
            originalName: image.originalName,
            mimeType: image.mimeType,
            size: image.size,
            altText: image.altText,
            isPrimary: image.isPrimary,
            createdAt: image.createdAt,
          });
        } catch (checkError) {
          console.log(`Source file does not exist: ${sourcePath}`);
          console.log(`Error checking file:`, checkError);
        }
      } catch (error) {
        console.error(`Failed to move archived image: ${image.fileName}`, error);
      }
    }

    // Create archive record
    const [archiveRecord] = await db.insert(itemArchives).values({
      itemId: itemToArchive.id,
      archivedBy: session.user.id,
      archivedAt: new Date(),
      reason: reason.trim(),
      archivedInventory: itemToArchive.inventory,
      archivedCondition: itemToArchive.condition,
      archivedConditionNotes: itemToArchive.conditionNotes,
      archivedImages: archivedImages,
      metadata: {
        productCode: itemToArchive.productCode,
        description: itemToArchive.description,
        brandCode: itemToArchive.brandCode,
        productGroup: itemToArchive.productGroup,
        productDivision: itemToArchive.productDivision,
        productCategory: itemToArchive.productCategory,
        vendor: itemToArchive.vendor,
        period: itemToArchive.period,
        season: itemToArchive.season,
        gender: itemToArchive.gender,
        mould: itemToArchive.mould,
        tier: itemToArchive.tier,
        silo: itemToArchive.silo,
        location: itemToArchive.location,
        unitOfMeasure: itemToArchive.unitOfMeasure,
        condition: itemToArchive.condition,
        conditionNotes: itemToArchive.conditionNotes,
        status: itemToArchive.status,
        createdBy: itemToArchive.createdBy,
        createdAt: itemToArchive.createdAt,
        updatedAt: itemToArchive.updatedAt,
        createdByUser: itemToArchive.createdByUser,
      },
    }).returning();

    // Delete the item images from database
    await db.delete(itemImagesTable).where(eq(itemImagesTable.itemId, itemId));

    // Update item status to archived
    await db.update(items)
      .set({ status: 'archived' })
      .where(eq(items.id, itemId));

    return NextResponse.json({ 
      message: 'Item archived successfully',
      archiveId: archiveRecord.id
    });
  } catch (error) {
    console.error('Failed to archive item:', error);
    return NextResponse.json(
      { error: 'Failed to archive item' },
      { status: 500 }
    );
  }
}
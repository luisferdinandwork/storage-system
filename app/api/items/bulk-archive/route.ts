// app/api/items/bulk-archive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemImages as itemImagesTable, itemArchives } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { writeFile, mkdir, rename } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can archive items
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { itemIds, reason } = body;

    // Validate required fields
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'Item IDs are required' },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Reason is required for archiving' },
        { status: 400 }
      );
    }

    // Get items to archive
    const itemsToArchive = await db
      .select()
      .from(items)
      .where(inArray(items.id, itemIds));

    if (itemsToArchive.length === 0) {
      return NextResponse.json({ error: 'No valid items found' }, { status: 404 });
    }

    // Filter out items that are already archived
    const activeItems = itemsToArchive.filter(item => item.status === 'active');
    
    if (activeItems.length === 0) {
      return NextResponse.json({ error: 'No active items found' }, { status: 404 });
    }

    // Archive each item
    const archivedItems = [];
    for (const item of activeItems) {
      try {
        // Get images for this item
        const images = await db
          .select()
          .from(itemImagesTable)
          .where(eq(itemImagesTable.itemId, item.id));

        // Archive images
        const archivedImages = [];
        if (images.length > 0) {
          for (const image of images) {
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
                console.log(`Archived image: ${image.fileName}`);
                
                archivedImages.push({
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
              console.error(`Failed to archive image: ${image.fileName}`, error);
            }
          }
        }

        // Create archive record with all required fields
        await db.insert(itemArchives).values({
          metadata: {}, // Empty metadata object
          reason: reason.trim(),
          itemId: item.id,
          archivedBy: session.user.id,
          archivedAt: new Date(),
          archivedImages: archivedImages,
          archivedInventory: item.inventory,
          archivedCondition: item.condition,
          archivedConditionNotes: item.conditionNotes,
        });

        // Delete image records
        await db.delete(itemImagesTable).where(eq(itemImagesTable.itemId, item.id));

        // Update item status to archived
        await db.update(items)
          .set({ 
            status: 'archived',
            updatedAt: new Date()
          })
          .where(eq(items.id, item.id));

        archivedItems.push({
          id: item.id,
          archivedImages: archivedImages.length,
        });
      } catch (error) {
        console.error(`Failed to archive item ${item.id}:`, error);
      }
    }

    return NextResponse.json({ 
      message: `${archivedItems.length} items archived successfully`,
      archivedItems
    });
  } catch (error) {
    console.error('Failed to bulk archive items:', error);
    return NextResponse.json(
      { error: 'Failed to bulk archive items' },
      { status: 500 }
    );
  }
}
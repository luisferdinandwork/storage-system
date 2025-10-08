// app/api/items/bulk-unarchive/route.ts
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
    
    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse the request body with error handling
    let requestBody;
    try {
      const text = await request.text();
      if (!text) {
        return NextResponse.json(
          { error: 'Request body is empty' },
          { status: 400 }
        );
      }
      requestBody = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { itemIds, reason } = requestBody;
    
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'Item IDs are required' }, { status: 400 });
    }
    
    if (!reason || reason.trim() === '') {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }
    
    // Get items to unarchive
    const itemsToUnarchive = await db
      .select()
      .from(items)
      .where(inArray(items.id, itemIds));

    if (itemsToUnarchive.length === 0) {
      return NextResponse.json({ error: 'No valid items found' }, { status: 404 });
    }

    // Filter out items that are not archived
    const archivedItems = itemsToUnarchive.filter(item => item.status === 'archived');
    
    if (archivedItems.length === 0) {
      return NextResponse.json({ error: 'No archived items found' }, { status: 404 });
    }

    // Get archive records for these items
    const archiveRecords = await db
      .select()
      .from(itemArchives)
      .where(inArray(itemArchives.itemId, archivedItems.map(item => item.id)));

    // Unarchive each item
    const unarchivedItems = [];
    for (const item of archivedItems) {
      try {
        // Find the archive record for this item
        const archiveRecord = archiveRecords.find(record => record.itemId === item.id);
        
        if (!archiveRecord) {
          console.error(`Archive record not found for item ${item.id}`);
          continue;
        }

        // Restore images from archived directory
        const restoredImages = [];
        if (archiveRecord.archivedImages && Array.isArray(archiveRecord.archivedImages)) {
          for (const image of archiveRecord.archivedImages) {
            try {
              const sourcePath = join(process.cwd(), 'public', 'archived', image.fileName);
              const uploadsDir = join(process.cwd(), 'public', 'uploads');
              
              // Ensure uploads directory exists
              await mkdir(uploadsDir, { recursive: true });
              
              const destPath = join(uploadsDir, image.fileName);
              
              // Check if source file exists before trying to move it
              try {
                await writeFile(sourcePath, Buffer.from(''), { flag: 'r' });
                console.log(`Source file exists: ${sourcePath}`);
                
                // Move the file
                await rename(sourcePath, destPath);
                console.log(`Restored archived image: ${image.fileName}`);
                
                // Insert the image record back to the database
                const [insertedImage] = await db.insert(itemImagesTable).values({
                  itemId: item.id,
                  fileName: image.fileName,
                  originalName: image.originalName,
                  mimeType: image.mimeType,
                  size: image.size,
                  altText: image.altText,
                  isPrimary: image.isPrimary,
                  createdAt: new Date(image.createdAt),
                }).returning();
                
                restoredImages.push(insertedImage);
              } catch (checkError) {
                console.log(`Source file does not exist: ${sourcePath}`);
                console.log(`Error checking file:`, checkError);
              }
            } catch (error) {
              console.error(`Failed to restore archived image: ${image.fileName}`, error);
            }
          }
        }

        // Update item status to active
        await db.update(items)
          .set({ 
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(items.id, item.id));

        // Delete the archive record
        await db.delete(itemArchives).where(eq(itemArchives.itemId, item.id));

        unarchivedItems.push({
          id: item.id,
          restoredImages: restoredImages.length,
        });
      } catch (error) {
        console.error(`Failed to unarchive item ${item.id}:`, error);
      }
    }

    return NextResponse.json({ 
      message: `${unarchivedItems.length} items unarchived successfully`,
      unarchivedItems
    });
  } catch (error) {
    console.error('Failed to bulk unarchive items:', error);
    return NextResponse.json(
      { error: 'Failed to bulk unarchive items' },
      { status: 500 }
    );
  }
}
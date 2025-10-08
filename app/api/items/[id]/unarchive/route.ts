// app/api/items/[id]/unarchive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemImages as itemImagesTable, itemArchives } from '@/lib/db/schema';
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

    // Only admins can unarchive items
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: itemId } = await params;
    
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

    const { reason } = requestBody;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Reason is required for unarchiving' },
        { status: 400 }
      );
    }

    // Get the item to unarchive
    const [itemToUnarchive] = await db
      .select()
      .from(items)
      .where(eq(items.id, itemId));

    if (!itemToUnarchive) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (itemToUnarchive.status !== 'archived') {
      return NextResponse.json({ error: 'Item is not archived' }, { status: 400 });
    }

    // Get the archive record for this item
    const [archiveRecord] = await db
      .select()
      .from(itemArchives)
      .where(eq(itemArchives.itemId, itemId));

    if (!archiveRecord) {
      return NextResponse.json({ error: 'Archive record not found' }, { status: 404 });
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
              itemId: itemId,
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
      .where(eq(items.id, itemId));

    // Delete the archive record
    await db.delete(itemArchives).where(eq(itemArchives.itemId, itemId));

    return NextResponse.json({ 
      message: 'Item unarchived successfully',
      restoredImages: restoredImages.length
    });
  } catch (error) {
    console.error('Failed to unarchive item:', error);
    return NextResponse.json(
      { error: 'Failed to unarchive item' },
      { status: 500 }
    );
  }
}
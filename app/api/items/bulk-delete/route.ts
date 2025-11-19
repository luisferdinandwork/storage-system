// app/api/items/bulk-delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemStock, itemImages, itemRequests, borrowRequestItems, itemClearances, stockMovements } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmin can bulk delete items
    if (session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { productCodes } = body; // Changed from itemIds to productCodes

    if (!productCodes || !Array.isArray(productCodes) || productCodes.length === 0) {
      return NextResponse.json({ error: 'No product codes provided' }, { status: 400 });
    }

    // Check which items actually exist before attempting to delete
    const existingItems = await db
      .select({ productCode: items.productCode }) // Changed from id to productCode
      .from(items)
      .where(inArray(items.productCode, productCodes)); // Changed from id to productCode
    
    const existingProductCodes = existingItems.map(item => item.productCode); // Changed to productCode
    const nonExistingProductCodes = productCodes.filter(code => !existingProductCodes.includes(code)); // Changed to productCode
    
    if (existingProductCodes.length === 0) {
      return NextResponse.json({ 
        error: 'None of the provided product codes exist',
        nonExistingProductCodes 
      }, { status: 404 });
    }

    // Get all images for these items to delete from filesystem
    const imagesToDelete = await db
      .select({ fileName: itemImages.fileName })
      .from(itemImages)
      .where(inArray(itemImages.itemId, existingProductCodes)); // Changed to productCode

    // Delete image files from filesystem
    const deletionErrors: string[] = [];
    for (const image of imagesToDelete) {
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

    // Delete all related records in the correct order to avoid foreign key constraint errors
    // 1. Delete stock movements
    await db.delete(stockMovements)
      .where(inArray(stockMovements.itemId, existingProductCodes)); // Changed to productCode
    
    // 2. Delete borrow request items
    await db.delete(borrowRequestItems)
      .where(inArray(borrowRequestItems.itemId, existingProductCodes)); // Changed to productCode
    
    // 3. Delete item clearances
    await db.delete(itemClearances)
      .where(inArray(itemClearances.itemId, existingProductCodes)); // Changed to productCode
    
    // 4. Delete item requests
    await db.delete(itemRequests)
      .where(inArray(itemRequests.itemId, existingProductCodes)); // Changed to productCode
    
    // 5. Delete item images
    await db.delete(itemImages)
      .where(inArray(itemImages.itemId, existingProductCodes)); // Changed to productCode
    
    // 6. Delete item stock
    await db.delete(itemStock)
      .where(inArray(itemStock.itemId, existingProductCodes)); // Changed to productCode
    
    // 7. Finally, delete the items
    const deletedItems = await db.delete(items)
      .where(inArray(items.productCode, existingProductCodes)) // Changed from id to productCode
      .returning({ productCode: items.productCode }); // Changed from id to productCode

    return NextResponse.json({ 
      message: `${deletedItems.length} items deleted successfully`,
      deletedCount: deletedItems.length,
      deletedItems: deletedItems.map(item => item.productCode), // Added deleted product codes
      nonExistingProductCodes: nonExistingProductCodes.length > 0 ? nonExistingProductCodes : undefined,
      deletionErrors: deletionErrors.length > 0 ? deletionErrors : undefined
    });
  } catch (error) {
    console.error('Error bulk deleting items:', error);
    return NextResponse.json({ 
      error: 'Failed to delete items',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
// app/api/items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db/';
import { items, users, itemImages, itemRequests, stockMovements } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { itemStock } from '@/lib/db/schema';

// GET /api/items - List items with their images
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build the query with updated schema
    let query = db
      .select({
        id: items.id,
        productCode: items.productCode,
        description: items.description,
        brandCode: items.brandCode,
        productDivision: items.productDivision,
        productCategory: items.productCategory,
        totalStock: items.totalStock,
        period: items.period,
        season: items.season,
        unitOfMeasure: items.unitOfMeasure,
        status: items.status,
        createdBy: items.createdBy,
        createdAt: items.createdAt,
        updatedAt: items.updatedAt,
        approvedBy: items.approvedBy,
        approvedAt: items.approvedAt,
        createdByUser: {
          id: users.id,
          name: users.name,
        },
        stock: {
          id: itemStock.id,
          itemId: itemStock.itemId,
          pending: itemStock.pending,
          inStorage: itemStock.inStorage,
          onBorrow: itemStock.onBorrow,
          inClearance: itemStock.inClearance,
          seeded: itemStock.seeded,
          location: itemStock.location,
          condition: itemStock.condition,
          conditionNotes: itemStock.conditionNotes,
          createdAt: itemStock.createdAt,
          updatedAt: itemStock.updatedAt,
        },
      })
      .from(items)
      .leftJoin(users, eq(items.createdBy, users.id))
      .leftJoin(itemStock, eq(items.id, itemStock.itemId));

    // Apply status filter if specified
    let itemsData;
    if (status) {
      itemsData = await query.where(eq(items.status, status as any));
    } else {
      itemsData = await query;
    }

    // Filter items that have stock in pending, inStorage, or onBorrow
    // Exclude items that ONLY have stock in clearance or seeded
    const filteredItems = itemsData.filter(item => {
      if (!item.stock) return false;
      
      const { pending, inStorage, onBorrow, inClearance, seeded } = item.stock;
      
      // Show item if it has any stock in pending, inStorage, or onBorrow
      const hasVisibleStock = pending > 0 || inStorage > 0 || onBorrow > 0;
      
      return hasVisibleStock;
    });

    // Fetch all images
    const allImages = await db
      .select()
      .from(itemImages);

    // Group images by itemId
    const imagesByItemId: Record<string, any[]> = {};
    for (const image of allImages) {
      if (!imagesByItemId[image.itemId]) {
        imagesByItemId[image.itemId] = [];
      }
      imagesByItemId[image.itemId].push(image);
    }

    // Combine items with their images
    const itemsWithImages = filteredItems.map(item => ({
      id: item.id,
      productCode: item.productCode,
      description: item.description,
      brandCode: item.brandCode,
      productDivision: item.productDivision,
      productCategory: item.productCategory,
      totalStock: item.totalStock,
      period: item.period,
      season: item.season,
      unitOfMeasure: item.unitOfMeasure,
      status: item.status,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      approvedBy: item.approvedBy,
      approvedAt: item.approvedAt,
      createdByUser: item.createdByUser,
      images: imagesByItemId[item.id] || [],
      stock: item.stock,
    }));

    return NextResponse.json(itemsWithImages);
  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/items - Create a new item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only superadmin and item-master can add items
    if (session.user.role !== 'superadmin' && session.user.role !== 'item-master') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    const { 
      productCode, 
      description, 
      totalStock, 
      period, 
      season, 
      unitOfMeasure,
      condition,
      conditionNotes,
      location,
      images: imageData 
    } = body;

    // Validate required fields
    if (!productCode || !description || !period || !season || !unitOfMeasure) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Parse product code to extract auto-generated fields
    const { parseProductCode } = await import('@/lib/db/schema');
    const parsed = parseProductCode(productCode);
    
    if (!parsed.isValid) {
      return NextResponse.json(
        { error: `Invalid product code: ${parsed.error}` },
        { status: 400 }
      );
    }

    // Check for duplicate product code
    const existingItem = await db
      .select()
      .from(items)
      .where(eq(items.productCode, productCode))
      .limit(1);

    if (existingItem.length > 0) {
      return NextResponse.json(
        { error: 'Product code already exists' },
        { status: 400 }
      );
    }

    // Create the item with pending_approval status
    const [newItem] = await db
    .insert(items)
    .values({
      productCode,
      description,
      brandCode: parsed.brandCode,
      productDivision: parsed.productDivision,
      productCategory: parsed.productCategory,
      totalStock: totalStock || 0,
      period,
      season,
      unitOfMeasure,
      status: 'pending_approval',
      createdBy: session.user.id,
    })
    .returning();
    
  // Create initial stock record
  const [newStock] = await db
    .insert(itemStock)
    .values({
      itemId: newItem.id,
      pending: totalStock || 0,
      onBorrow: 0,
      inClearance: 0,
      seeded: 0,
      location: location || null,
      condition: condition || 'good',
      conditionNotes: conditionNotes || null,
    })
    .returning();

  // Record initial stock movement
  if (totalStock && totalStock > 0) {
    await db
      .insert(stockMovements)
      .values({
        itemId: newItem.id,
        stockId: newStock.id,
        movementType: 'initial_stock',
        quantity: totalStock,
        fromState: 'none',
        toState: 'pending',
        performedBy: session.user.id,
        notes: 'Initial stock creation - pending approval',
      });
  }

    // Create item request for approval workflow
    await db
      .insert(itemRequests)
      .values({
        itemId: newItem.id,
        requestedBy: session.user.id,
        status: 'pending',
        notes: 'New item added, awaiting approval from Storage Master',
      });

    // Create item images if provided
    let newImages: any[] = [];
    if (imageData && Array.isArray(imageData) && imageData.length > 0) {
      const imagesToInsert = imageData.map((image: any, index: number) => ({
        itemId: newItem.id,
        fileName: image.fileName,
        originalName: image.originalName,
        mimeType: image.mimeType,
        size: image.size,
        altText: image.altText || `${description} - Image ${index + 1}`,
        isPrimary: image.isPrimary || index === 0,
      }));

      newImages = await db
        .insert(itemImages)
        .values(imagesToInsert)
        .returning();
    }

    return NextResponse.json(
      { 
        ...newItem, 
        images: newImages,
        stock: newStock,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create item:', error);
    return NextResponse.json(
      { error: 'Failed to create item', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
// app/api/items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db/';
import { items, users, itemImages, itemRequests, stockMovements, boxes, locations } from '@/lib/db/schema';
import { eq, and, or, desc, sum } from 'drizzle-orm';
import { itemStock } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

// GET /api/items - List items with aggregated stock from all locations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // First, get all items with basic info
    let itemsQuery = db
      .select({
        productCode: items.productCode,
        description: items.description,
        brandCode: items.brandCode,
        productDivision: items.productDivision,
        productCategory: items.productCategory,
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
      })
      .from(items)
      .leftJoin(users, eq(items.createdBy, users.id))
      .orderBy(desc(items.updatedAt));

    // Apply status filter if specified
    let itemsData;
    if (status) {
      itemsData = await itemsQuery.where(eq(items.status, status as any));
    } else {
      itemsData = await itemsQuery;
    }

    // Fetch all images
    const allImages = await db
      .select()
      .from(itemImages);

    // Group images by itemId (productCode)
    const imagesByItemId: Record<string, any[]> = {};
    for (const image of allImages) {
      if (!imagesByItemId[image.itemId]) {
        imagesByItemId[image.itemId] = [];
      }
      imagesByItemId[image.itemId].push(image);
    }

    // For each item, aggregate stock from all locations
    const itemsWithAggregatedStock = await Promise.all(
      itemsData.map(async (item) => {
        // Get all stock records for this item
        const stockRecords = await db
          .select({
            stock: itemStock,
            box: boxes,
            location: locations,
          })
          .from(itemStock)
          .leftJoin(boxes, eq(itemStock.boxId, boxes.id))
          .leftJoin(locations, eq(boxes.locationId, locations.id))
          .where(eq(itemStock.itemId, item.productCode));

        // Aggregate quantities across all locations
        const aggregatedStock = stockRecords.reduce(
          (totals, record) => ({
            pending: totals.pending + record.stock.pending,
            inStorage: totals.inStorage + record.stock.inStorage,
            onBorrow: totals.onBorrow + record.stock.onBorrow,
            inClearance: totals.inClearance + record.stock.inClearance,
            seeded: totals.seeded + record.stock.seeded,
          }),
          { pending: 0, inStorage: 0, onBorrow: 0, inClearance: 0, seeded: 0 }
        );

        // Calculate total stock
        const totalStock = 
          aggregatedStock.pending + 
          aggregatedStock.inStorage + 
          aggregatedStock.onBorrow + 
          aggregatedStock.inClearance + 
          aggregatedStock.seeded;

        // Check if item should be visible (has stock in pending, inStorage, or onBorrow)
        const hasVisibleStock = 
          aggregatedStock.pending > 0 || 
          aggregatedStock.inStorage > 0 || 
          aggregatedStock.onBorrow > 0;

        return {
          ...item,
          stock: aggregatedStock, // Aggregated stock quantities
          stockRecords: stockRecords.map(r => ({
            ...r.stock,
            box: r.box,
            location: r.location,
          })), // Individual stock records with location details
          totalStock,
          hasVisibleStock,
          images: imagesByItemId[item.productCode] || [],
        };
      })
    );

    // Filter items that have visible stock
    const filteredItems = itemsWithAggregatedStock.filter(item => item.hasVisibleStock);

    // Remove hasVisibleStock flag before sending response
    const responseItems = filteredItems.map(({ hasVisibleStock, ...item }) => item);

    return NextResponse.json(responseItems);
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

    // ADDED: Check if email exists
    if (!session.user.email) {
      return NextResponse.json({ error: 'User email not found in session' }, { status: 401 });
    }

    // Only superadmin and item-master can add items
    if (session.user.role !== 'superadmin' && session.user.role !== 'item-master') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    const { 
      productCode, 
      description, 
      initialStock,
      period, 
      season, 
      unitOfMeasure,
      condition,
      conditionNotes,
      boxId,
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

    // FIXED: Get the actual user ID from the database to ensure it exists
    const userEmail = session.user.email; // Store in variable after null check
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail)) // Now TypeScript knows it's not null/undefined
      .limit(1);

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
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
        period,
        season,
        unitOfMeasure,
        status: 'pending_approval',
        createdBy: currentUser.id,
      })
      .returning();
    
    // Handle boxId - convert 'none' to null
    const actualBoxId = boxId === 'none' || !boxId ? null : boxId;
    
    // Create initial stock record
    const [newStock] = await db
      .insert(itemStock)
      .values({
        itemId: newItem.productCode,
        pending: initialStock || 0,
        inStorage: 0,
        onBorrow: 0,
        inClearance: 0,
        seeded: 0,
        boxId: actualBoxId,
        condition: condition || 'good',
        conditionNotes: conditionNotes || null,
      })
      .returning();

    // Record initial stock movement
    if (initialStock && initialStock > 0) {
      await db
        .insert(stockMovements)
        .values({
          itemId: newItem.productCode,
          stockId: newStock.id,
          movementType: 'initial_stock',
          quantity: initialStock,
          fromState: 'none',
          toState: 'pending',
          boxId: actualBoxId,
          performedBy: currentUser.id,
          notes: 'Initial stock creation - pending approval',
        });
    }

    // Create item request for approval workflow
    await db
      .insert(itemRequests)
      .values({
        itemId: newItem.productCode,
        requestedBy: currentUser.id,
        status: 'pending',
        notes: 'New item added, awaiting approval from Storage Master',
      });

    // Create item images if provided
    let newImages: any[] = [];
    if (imageData && Array.isArray(imageData) && imageData.length > 0) {
      const imagesToInsert = imageData.map((image: any, index: number) => ({
        itemId: newItem.productCode,
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

    // Fetch box and location data if box is assigned
    let boxData = null;
    let locationData = null;
    
    if (actualBoxId) {
      const [boxWithLocation] = await db
        .select({
          box: boxes,
          location: locations,
        })
        .from(boxes)
        .leftJoin(locations, eq(boxes.locationId, locations.id))
        .where(eq(boxes.id, actualBoxId))
        .limit(1);
      
      if (boxWithLocation) {
        boxData = boxWithLocation.box;
        locationData = boxWithLocation.location;
      }
    }

    return NextResponse.json(
      { 
        ...newItem, 
        images: newImages,
        stock: newStock,
        box: boxData,
        location: locationData,
        totalStock: initialStock || 0
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
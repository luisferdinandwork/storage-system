import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, users, itemImages, itemRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/items - List items with their images
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build the query
    let query = db
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
        approvedBy: items.approvedBy,
        approvedAt: items.approvedAt,
        createdByUser: {
          id: users.id,
          name: users.name,
        },
      })
      .from(items)
      .leftJoin(users, eq(items.createdBy, users.id));

    // Apply status filter if specified
    let itemsData;
    if (status) {
      itemsData = await query.where(eq(items.status, status as any));
    } else {
      itemsData = await query;
    }

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
    const itemsWithImages = itemsData.map(item => ({
      ...item,
      images: imagesByItemId[item.id] || [],
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
      unitOfMeasure,
      condition,
      conditionNotes,
      images: imageData 
    } = body;

    // Validate required fields
    if (!productCode || !description || !brandCode || !productGroup || !productDivision || 
        !productCategory || !vendor || !period || !season || !gender || !mould || !tier || !silo || 
        !unitOfMeasure || !condition) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
        location: null, // Will be set by storage master
        unitOfMeasure,
        condition,
        conditionNotes: conditionNotes || null,
        status: 'pending_approval',
        createdBy: session.user.id,
        approvedBy: null,
        approvedAt: null,
      })
      .returning();

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
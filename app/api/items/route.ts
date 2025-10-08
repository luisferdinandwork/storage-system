import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, users, itemImages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/items - List all items with their images
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build the base query
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
        createdByUser: {
          id: users.id,
          name: users.name,
        },
      })
      .from(items)
      .leftJoin(users, eq(items.createdBy, users.id));

    // Execute the query with or without status filter
    const itemsData = status && (status === 'active' || status === 'archived')
      ? await query.where(eq(items.status, status))
      : await query;

    // Fetch all images for all items
    const allImages = await db
      .select()
      .from(itemImages);

    // Group images by itemId
    const imagesByItemId = allImages.reduce((acc, image) => {
      if (!acc[image.itemId]) {
        acc[image.itemId] = [];
      }
      acc[image.itemId].push(image);
      return acc;
    }, {} as Record<string, typeof allImages>);

    // Combine items with their images
    const itemsWithImages = itemsData.map(item => ({
      ...item,
      images: imagesByItemId[item.id] || [],
    }));

    return NextResponse.json(itemsWithImages);
  } catch (error) {
    console.error('Failed to fetch items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
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

    // Only admins can add items
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    console.log('Received request body:', body); // Add this line for debugging
    
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
      status,
      images 
    } = body;

    // Validate required fields
    if (!productCode || !description || !brandCode || !productGroup || !productDivision || 
        !productCategory || !vendor || !period || !season || !gender || !mould || !tier || !silo || 
        !location || !unitOfMeasure || !condition) {
      console.log('Missing required fields:', {
        productCode: !!productCode,
        description: !!description,
        brandCode: !!brandCode,
        productGroup: !!productGroup,
        productDivision: !!productDivision,
        productCategory: !!productCategory,
        vendor: !!vendor,
        period: !!period,
        season: !!season,
        gender: !!gender,
        mould: !!mould,
        tier: !!tier,
        silo: !!silo,
        location: !!location,
        unitOfMeasure: !!unitOfMeasure,
        condition: !!condition,
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the item
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
        location,
        unitOfMeasure,
        condition,
        conditionNotes: conditionNotes || null,
        status: status || 'active', // Use provided status or default to 'active'
        createdBy: session.user.id,
      })
      .returning();

    // Create item images if provided
    let newImages: { id: string; createdAt: Date; itemId: string; fileName: string; originalName: string; mimeType: string; size: number; altText: string | null; isPrimary: boolean; }[] = [];
    if (images && images.length > 0) {
      const imagesToInsert = images.map((image: { fileName: string; originalName: string; mimeType: string; size: number; altText?: string; isPrimary?: boolean }, index: number) => ({
        itemId: newItem.id,
        fileName: image.fileName,
        originalName: image.originalName,
        mimeType: image.mimeType,
        size: image.size,
        altText: image.altText || `${description} - Image ${index + 1}`,
        isPrimary: image.isPrimary || index === 0, // First image is primary by default
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
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}
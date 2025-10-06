// File: app/api/items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items, itemSizes, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/items - List all items with their sizes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all items with their sizes and the user who added them
    const itemsData = await db
      .select({
        id: items.id,
        name: items.name,
        description: items.description,
        category: items.category,
        addedBy: items.addedBy,
        createdAt: items.createdAt,
        updatedAt: items.updatedAt,
        addedByUser: {
          id: users.id,
          name: users.name,
        },
      })
      .from(items)
      .leftJoin(users, eq(items.addedBy, users.id));

    // Fetch all sizes for all items
    const allSizes = await db
      .select()
      .from(itemSizes);

    // Group sizes by itemId
    const sizesByItemId = allSizes.reduce((acc, size) => {
      if (!acc[size.itemId]) {
        acc[size.itemId] = [];
      }
      acc[size.itemId].push(size);
      return acc;
    }, {} as Record<string, typeof allSizes>);

    // Combine items with their sizes
    const itemsWithSizes = itemsData.map(item => ({
      ...item,
      sizes: sizesByItemId[item.id] || [],
    }));

    return NextResponse.json(itemsWithSizes);
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
    const { name, description, category, sizes } = body;

    // Validate required fields
    if (!name || !category || !sizes || sizes.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the item
    const [newItem] = await db
      .insert(items)
      .values({
        name,
        description: description || null,
        category,
        addedBy: session.user.id,
      })
      .returning();

    // Create the item sizes
    const sizesToInsert = sizes.map((size: { size: string; quantity: number }) => ({
      itemId: newItem.id,
      size: size.size,
      quantity: size.quantity,
      available: size.quantity, // Initially, all items are available
    }));

    const newSizes = await db
      .insert(itemSizes)
      .values(sizesToInsert)
      .returning();

    return NextResponse.json(
      { ...newItem, sizes: newSizes },
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
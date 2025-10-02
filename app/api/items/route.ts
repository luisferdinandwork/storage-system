// app/api/items/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allItems = await db.select().from(items);
    return NextResponse.json(allItems);
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, category, size, quantity } = await request.json();
    
    if (!name || !category || !size || !quantity) {
      return NextResponse.json({ error: 'Name, category, size, and quantity are required' }, { status: 400 });
    }

    const newItem = await db.insert(items).values({
      name,
      description: description || null,
      category,
      size,
      quantity: parseInt(quantity),
      available: parseInt(quantity),
      addedBy: session.user.id,
    }).returning();

    return NextResponse.json(newItem[0], { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
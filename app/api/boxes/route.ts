// app/api/boxes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { boxes, locations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const boxesData = await db
      .select({
        id: boxes.id,
        boxNumber: boxes.boxNumber,
        description: boxes.description,
        location: {
          id: locations.id,
          name: locations.name,
        }
      })
      .from(boxes)
      .leftJoin(locations, eq(boxes.locationId, locations.id));

    return NextResponse.json(boxesData);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch boxes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to add boxes
    const allowedRoles = ['superadmin', 'storage-master', 'storage-master-manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { boxNumber, description, locationId } = await request.json();

    if (!boxNumber || !locationId) {
      return NextResponse.json(
        { error: 'Box number and location are required' },
        { status: 400 }
      );
    }

    // Check if the location exists
    const location = await db.query.locations.findFirst({
      where: eq(locations.id, locationId),
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Check if a box with the same number already exists in this location
    const existingBox = await db.query.boxes.findFirst({
      where: eq(boxes.boxNumber, boxNumber),
    });

    if (existingBox) {
      return NextResponse.json(
        { error: 'A box with this number already exists in this location' },
        { status: 400 }
      );
    }

    // Create the new box
    const newBox = await db.insert(boxes).values({
      boxNumber,
      description: description || null,
      locationId,
    }).returning();

    return NextResponse.json({
      message: 'Box created successfully',
      box: newBox[0],
    });
  } catch (error) {
    console.error('Failed to create box:', error);
    return NextResponse.json(
      { error: 'Failed to create box' },
      { status: 500 }
    );
  }
}
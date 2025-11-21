// app/api/locations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { locations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view locations
    const allowedRoles = ['superadmin', 'storage-master', 'storage-manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const locationsData = await db
      .select()
      .from(locations)
      .orderBy(locations.name);

    return NextResponse.json(locationsData);
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to add locations
    const allowedRoles = ['superadmin', 'storage-master', 'storage-manager'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      );
    }

    // Check if a location with the same name already exists
    const existingLocation = await db.query.locations.findFirst({
      where: eq(locations.name, name),
    });

    if (existingLocation) {
      return NextResponse.json(
        { error: 'A location with this name already exists' },
        { status: 400 }
      );
    }

    // Create the new location
    const newLocation = await db.insert(locations).values({
      name,
      description: description || null,
    }).returning();

    return NextResponse.json({
      message: 'Location created successfully',
      location: newLocation[0],
    });
  } catch (error) {
    console.error('Failed to create location:', error);
    return NextResponse.json(
      { error: 'Failed to create location', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
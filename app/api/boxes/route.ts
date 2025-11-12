// app/api/boxes/route.ts

import { NextResponse } from 'next/server';
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
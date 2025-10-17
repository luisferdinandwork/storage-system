import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db/schema/index';
import { itemClearances, items, users } from '@/lib/db/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only storage masters and superadmins can view seeding records
    const isStorageMaster = session.user.role === 'storage-master' || session.user.role === 'storage-master-manager';
    const isSuperAdmin = session.user.role === 'superadmin';
    
    if (!isStorageMaster && !isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build query conditions
    let whereConditions = [
      isNotNull(itemClearances.metadata),
    ];

    // Filter by seeding type
    whereConditions.push(
      eq(itemClearances.metadata, sql`'type' = 'seeding'`)
    );

    // Filter by status if specified
    if (status !== 'all') {
      whereConditions.push(eq(itemClearances.status, status as any));
    }

    // Filter by date range if specified
    if (dateFrom) {
      whereConditions.push(
        eq(itemClearances.clearedAt, sql`${itemClearances.clearedAt} >= ${new Date(dateFrom)}`)
      );
    }

    if (dateTo) {
      whereConditions.push(
        eq(itemClearances.clearedAt, sql`${itemClearances.clearedAt} <= ${new Date(dateTo)}`)
      );
    }

    // Fetch seeding records
    const seedingRecords = await db.select({
      id: itemClearances.id,
      itemId: itemClearances.itemId,
      reason: itemClearances.reason,
      status: itemClearances.status,
      requestedAt: itemClearances.requestedAt,
      approvedAt: itemClearances.approvedAt,
      clearedAt: itemClearances.clearedAt,
      metadata: itemClearances.metadata,
      item: {
        id: items.id,
        productCode: items.productCode,
        description: items.description,
        brandCode: items.brandCode,
        productDivision: items.productDivision,
        productCategory: items.productCategory,
        condition: items.condition,
        location: items.location,
      },
      requestedByUser: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
      approvedByUser: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(itemClearances)
    .leftJoin(items, eq(itemClearances.itemId, items.id))
    .leftJoin(users, eq(itemClearances.requestedBy, users.id))
    .leftJoin(users, eq(itemClearances.approvedBy, users.id))
    .where(and(...whereConditions))
    .orderBy(itemClearances.clearedAt);

    // Filter only seeding records and parse metadata
    const filteredRecords = seedingRecords
      .filter(record => {
        try {
          const metadata = record.metadata as any;
          return metadata.type === 'seeding';
        } catch {
          return false;
        }
      })
      .map(record => ({
        ...record,
        metadata: record.metadata as any,
      }));

    return NextResponse.json(filteredRecords);
  } catch (error) {
    console.error('Error fetching seeding records:', error);
    return NextResponse.json({ error: 'Failed to fetch seeding records' }, { status: 500 });
  }
}
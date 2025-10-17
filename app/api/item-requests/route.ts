// app/api/item-requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { itemRequests, items, users, itemImages, itemStock } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET /api/item-requests - List all item requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build the query using Drizzle ORM
    const requests = await db.query.itemRequests.findMany({
      with: {
        item: {
          with: {
            images: true,
            stock: true,
            createdBy: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
        requestedBy: {
          columns: {
            id: true,
            name: true,
            role: true,
          },
        },
        approvedBy: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [desc(itemRequests.requestedAt)],
    });

    // Filter by status if provided
    const filteredRequests = status 
      ? requests.filter(req => req.status === status)
      : requests;

    // Format the response
    const formattedRequests = filteredRequests.map((request) => ({
      id: request.id,
      itemId: request.itemId,
      requestedBy: request.requestedBy,
      requestedAt: request.requestedAt,
      status: request.status,
      approvedBy: request.approvedBy,
      approvedAt: request.approvedAt,
      rejectionReason: request.rejectionReason,
      notes: request.notes,
      item: {
        ...request.item,
        images: request.item.images || [],
      },
      requestedByUser: request.requestedBy || {
        id: request.requestedBy,
        name: 'Unknown',
        role: 'unknown',
      },
      approvedByUser: request.approvedBy || null,
    }));

    return NextResponse.json(formattedRequests);
  } catch (error) {
    console.error('Failed to fetch item requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item requests' },
      { status: 500 }
    );
  }
}
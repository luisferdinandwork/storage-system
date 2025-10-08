import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests, items, users, departments } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create aliases for users table to avoid conflicts
    const requestUser = alias(users, 'requestUser');
    const managerUser = alias(users, 'managerUser');
    const adminUser = alias(users, 'adminUser');

    let requests;
    
    if (session.user.role === 'user') {
      // Users can only see their own requests
      requests = await db.select({
        id: borrowRequests.id,
        item: {
          id: items.id,
          name: items.name,
          category: items.category,
        },
        itemSize: {
          id: itemSizes.id,
          size: itemSizes.size,
          quantity: itemSizes.quantity,
          available: itemSizes.available,
        },
        user: {
          id: requestUser.id,
          name: requestUser.name,
          email: requestUser.email,
          role: requestUser.role,
          departmentId: requestUser.departmentId,
        },
        quantity: borrowRequests.quantity,
        startDate: borrowRequests.startDate,
        endDate: borrowRequests.endDate,
        reason: borrowRequests.reason,
        status: borrowRequests.status,
        managerApproved: borrowRequests.managerApproved,
        adminApproved: borrowRequests.adminApproved,
        managerApprovedBy: {
          id: managerUser.id,
          name: managerUser.name,
        },
        adminApprovedBy: {
          id: adminUser.id,
          name: adminUser.name,
        },
        managerApprovedAt: borrowRequests.managerApprovedAt,
        adminApprovedAt: borrowRequests.adminApprovedAt,
        rejectionReason: borrowRequests.rejectionReason,
        returnedAt: borrowRequests.returnedAt,
      })
      .from(borrowRequests)
      .leftJoin(items, eq(borrowRequests.itemId, items.id))
      .leftJoin(itemSizes, eq(borrowRequests.itemSizeId, itemSizes.id))
      .leftJoin(requestUser, eq(borrowRequests.userId, requestUser.id))
      .leftJoin(managerUser, eq(borrowRequests.managerApprovedBy, managerUser.id))
      .leftJoin(adminUser, eq(borrowRequests.adminApprovedBy, adminUser.id))
      .where(eq(borrowRequests.userId, session.user.id));
    } else if (session.user.role === 'manager') {
      // Managers can only see requests from users in their department
      // First get the manager's department
      const manager = await db.select({
        departmentId: users.departmentId,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
      
      if (!manager.length || !manager[0].departmentId) {
        return NextResponse.json({ error: 'Manager department not found' }, { status: 400 });
      }
      
      const managerDepartmentId = manager[0].departmentId;
      
      // Get requests from users in the same department
      requests = await db.select({
        id: borrowRequests.id,
        item: {
          id: items.id,
          name: items.name,
          category: items.category,
        },
        itemSize: {
          id: itemSizes.id,
          size: itemSizes.size,
          quantity: itemSizes.quantity,
          available: itemSizes.available,
        },
        user: {
          id: requestUser.id,
          name: requestUser.name,
          email: requestUser.email,
          role: requestUser.role,
          departmentId: requestUser.departmentId,
        },
        quantity: borrowRequests.quantity,
        startDate: borrowRequests.startDate,
        endDate: borrowRequests.endDate,
        reason: borrowRequests.reason,
        status: borrowRequests.status,
        managerApproved: borrowRequests.managerApproved,
        adminApproved: borrowRequests.adminApproved,
        managerApprovedBy: {
          id: managerUser.id,
          name: managerUser.name,
        },
        adminApprovedBy: {
          id: adminUser.id,
          name: adminUser.name,
        },
        managerApprovedAt: borrowRequests.managerApprovedAt,
        adminApprovedAt: borrowRequests.adminApprovedAt,
        rejectionReason: borrowRequests.rejectionReason,
        returnedAt: borrowRequests.returnedAt,
      })
      .from(borrowRequests)
      .leftJoin(items, eq(borrowRequests.itemId, items.id))
      .leftJoin(itemSizes, eq(borrowRequests.itemSizeId, itemSizes.id))
      .leftJoin(requestUser, eq(borrowRequests.userId, requestUser.id))
      .leftJoin(managerUser, eq(borrowRequests.managerApprovedBy, managerUser.id))
      .leftJoin(adminUser, eq(borrowRequests.adminApprovedBy, adminUser.id))
      .where(eq(requestUser.departmentId, managerDepartmentId));
    } else {
      // Admins can see all requests
      requests = await db.select({
        id: borrowRequests.id,
        item: {
          id: items.id,
          name: items.name,
          category: items.category,
        },
        itemSize: {
          id: itemSizes.id,
          size: itemSizes.size,
          quantity: itemSizes.quantity,
          available: itemSizes.available,
        },
        user: {
          id: requestUser.id,
          name: requestUser.name,
          email: requestUser.email,
          role: requestUser.role,
          departmentId: requestUser.departmentId,
        },
        quantity: borrowRequests.quantity,
        startDate: borrowRequests.startDate,
        endDate: borrowRequests.endDate,
        reason: borrowRequests.reason,
        status: borrowRequests.status,
        managerApproved: borrowRequests.managerApproved,
        adminApproved: borrowRequests.adminApproved,
        managerApprovedBy: {
          id: managerUser.id,
          name: managerUser.name,
        },
        adminApprovedBy: {
          id: adminUser.id,
          name: adminUser.name,
        },
        managerApprovedAt: borrowRequests.managerApprovedAt,
        adminApprovedAt: borrowRequests.adminApprovedAt,
        rejectionReason: borrowRequests.rejectionReason,
        returnedAt: borrowRequests.returnedAt,
      })
      .from(borrowRequests)
      .leftJoin(items, eq(borrowRequests.itemId, items.id))
      .leftJoin(itemSizes, eq(borrowRequests.itemSizeId, itemSizes.id))
      .leftJoin(requestUser, eq(borrowRequests.userId, requestUser.id))
      .leftJoin(managerUser, eq(borrowRequests.managerApprovedBy, managerUser.id))
      .leftJoin(adminUser, eq(borrowRequests.adminApprovedBy, adminUser.id));
    }
    
    // Fetch department information for each request
    const requestsWithDepartments = await Promise.all(
      requests.map(async (request) => {
        if (request.user && request.user.departmentId) {
          const department = await db.select({
            id: departments.id,
            name: departments.name,
          })
          .from(departments)
          .where(eq(departments.id, request.user.departmentId))
          .limit(1);
          
          return {
            ...request,
            user: {
              ...request.user,
              department: department.length ? department[0] : undefined,
            },
          };
        }
        return {
          ...request,
          user: {
            ...request.user,
            department: undefined,
          },
        };
      })
    );
    
    return NextResponse.json(requestsWithDepartments);
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId, itemSizeId, quantity, startDate, endDate, reason } = await request.json();
    
    if (!itemId || !itemSizeId || !quantity || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if the item exists
    const item = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
    
    if (!item.length) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check if the item size exists and has enough available quantity
    const itemSize = await db.select().from(itemSizes).where(eq(itemSizes.id, itemSizeId)).limit(1);
    
    if (!itemSize.length) {
      return NextResponse.json({ error: 'Item size not found' }, { status: 404 });
    }

    if (itemSize[0].available < quantity) {
      return NextResponse.json({ error: 'Not enough items available' }, { status: 400 });
    }

    // Check if the requested period is within 14 days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    const maxEndDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    if (start < today || end > maxEndDate) {
      return NextResponse.json({ error: 'Invalid date range. Maximum borrowing period is 14 days.' }, { status: 400 });
    }

    // Create the borrow request
    const newRequest = await db.insert(borrowRequests).values({
      itemId,
      itemSizeId,
      userId: session.user.id,
      quantity,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
    }).returning();

    return NextResponse.json(newRequest[0], { status: 201 });
  } catch (error) {
    console.error('Error creating request:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
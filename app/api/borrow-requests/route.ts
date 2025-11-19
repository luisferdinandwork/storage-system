// app/api/borrow-requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { borrowRequests, borrowRequestItems, items, itemStock, users, departments } from '@/lib/db/schema';
import { eq, and, lt, gte, inArray, desc } from 'drizzle-orm';

// Helper function to generate the next BRW ID (unchanged)
async function generateBorrowRequestId(): Promise<string> {
  // Get the latest borrow request with BRW prefix
  const latestRequest = await db.query.borrowRequests.findFirst({
    where: (borrowRequests, { like }) => like(borrowRequests.id, 'BRW-%'),
    orderBy: [desc(borrowRequests.id)],
    columns: {
      id: true,
    },
  });

  let nextNumber = 1;
  
  if (latestRequest && latestRequest.id) {
    // Extract numeric part from BRW-00000
    const numericPart = latestRequest.id.substring(4);
    const currentNumber = parseInt(numericPart, 10);
    
    if (!isNaN(currentNumber)) {
      nextNumber = currentNumber + 1;
    }
  }

  // Format with leading zeros (5 digits)
  const formattedNumber = nextNumber.toString().padStart(5, '0');
  return `BRW-${formattedNumber}`;
}

// POST /api/borrow-requests - Create a new borrow request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      items: requestedItems, 
      // startDate, 
      // endDate, 
      reason 
    } = await request.json();

    // Validate input
    if (!requestedItems || !Array.isArray(requestedItems) || requestedItems.length === 0) {
      return NextResponse.json(
        { error: 'At least one item must be requested' },
        { status: 400 }
      );
    }

    // if (!startDate || !endDate || !reason) {
    //   return NextResponse.json(
    //     { error: 'Start date, end date, and reason are required' },
    //     { status: 400 }
    //   );
    // }

    // // Validate dates
    // const start = new Date(startDate);
    // const end = new Date(endDate);
    // const now = new Date();

    // if (start < now) {
    //   return NextResponse.json(
    //     { error: 'Start date cannot be in the past' },
    //     { status: 400 }
    //   );
    // }

    // if (end <= start) {
    //   return NextResponse.json(
    //     { error: 'End date must be after start date' },
    //     { status: 400 }
    //   );
    // }

    // Get user information with department
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      with: {
        department: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if all items exist and have sufficient stock
    const itemIds = requestedItems.map(item => item.itemId);
    
    // For multiple items, we need to fetch them one by one or use inArray
    const allDbItems = [];
    for (const itemId of itemIds) {
      // Updated: Use productCode instead of id
      const dbItem = await db.query.items.findFirst({
        where: eq(items.productCode, itemId), // Changed from items.id to items.productCode
        with: {
          stock: {
            with: {
              box: {
                with: {
                  location: true,
                },
              },
            },
          },
        },
      });
      if (dbItem) allDbItems.push(dbItem);
    }

    if (allDbItems.length !== itemIds.length) {
      return NextResponse.json(
        { error: 'One or more items not found' },
        { status: 404 }
      );
    }

    // Check stock availability for each item
    for (const requestedItem of requestedItems) {
      const dbItem = allDbItems.find(item => item.productCode === requestedItem.itemId); // Changed from item.id to item.productCode
      if (!dbItem?.stock || dbItem.stock.inStorage < requestedItem.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for item ${dbItem?.description || 'Unknown'}` },
          { status: 400 }
        );
      }
    }

    // Generate the BRW ID
    const borrowRequestId = await generateBorrowRequestId();

    // Determine initial status based on user role
    const userRole = session.user.role;
    const initialStatus = userRole === 'user' ? 'pending_manager' : 'pending_storage';

    const placeholderDate = new Date('1970-01-01');

    // Create the borrow request
    const [borrowRequest] = await db.insert(borrowRequests).values({
      id: borrowRequestId, // Use the generated ID
      userId: session.user.id,
      startDate: placeholderDate,
      endDate: placeholderDate,
      reason,
      status: initialStatus,
    }).returning();

    // Create borrow request items
    for (const requestedItem of requestedItems) {
      await db.insert(borrowRequestItems).values({
        borrowRequestId: borrowRequestId, // Use the generated ID
        itemId: requestedItem.itemId, // This is now the productCode
        quantity: requestedItem.quantity,
        status: initialStatus,
      });
    }

    return NextResponse.json({
      message: 'Borrow request created successfully',
      borrowRequest,
    });
  } catch (error) {
    console.error('Failed to create borrow request:', error);
    return NextResponse.json(
      { error: 'Failed to create borrow request' },
      { status: 500 }
    );
  }
}

// GET /api/borrow-requests - List borrow requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    // Get current user with department
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      with: {
        department: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build the query
    const requests = await db.query.borrowRequests.findMany({
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
          with: {
            department: true,
          },
        },
        items: {
          with: {
            item: {
              with: {
                images: true,
                stock: { // Include stock information
                  with: {
                    box: { // Include box information
                      with: {
                        location: true, // Include location information
                      },
                    },
                  },
                },
              },
            },
          },
        },
        managerApprovedBy: {
          columns: {
            id: true,
            name: true,
          },
        },
        storageApprovedBy: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [borrowRequests.requestedAt],
    });

    // Filter results based on user role and query parameters
    let filteredRequests = requests;
    
    // Regular users can only see their own requests
    if (session.user.role === 'user') {
      filteredRequests = filteredRequests.filter(req => req.userId === session.user.id);
    }
    // Managers can only see requests from their department
    else if (session.user.role === 'manager') {
      filteredRequests = filteredRequests.filter(req => 
        req.user.department?.id === currentUser.department?.id
      );
    }
    // Storage masters and superadmins can see all requests
    // No additional filtering needed
    
    // Apply status filter if provided
    if (status) {
      filteredRequests = filteredRequests.filter(req => req.status === status);
    }
    
    // Apply user filter if provided (only for managers and above)
    if (userId && ['superadmin', 'storage-master', 'storage-master-manager', 'manager'].includes(session.user.role)) {
      filteredRequests = filteredRequests.filter(req => req.userId === userId);
    }

    return NextResponse.json(filteredRequests);
  } catch (error) {
    console.error('Failed to fetch borrow requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch borrow requests' },
      { status: 500 }
    );
  }
}
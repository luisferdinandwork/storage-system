// app/api/dashboard/system-overview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  items, 
  itemStock, 
  itemClearances, 
  clearanceForms, 
  stockMovements,
  users,
  departments,
  locations,
  boxes
} from '@/lib/db/schema';
import { eq, and, isNotNull, gt, lt, gte, sql, desc, count, sum } from 'drizzle-orm';
import { subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get approved items count
    const approvedItemsResult = await db
      .select({ count: count() })
      .from(items)
      .where(eq(items.status, 'approved'));
    
    const approvedItems = approvedItemsResult[0]?.count || 0;

    // Get rejected items count
    const rejectedItemsResult = await db
      .select({ count: count() })
      .from(items)
      .where(eq(items.status, 'rejected'));
    
    const rejectedItems = rejectedItemsResult[0]?.count || 0;

    // Get low stock items (items with inStorage < 5)
    const lowStockItemsResult = await db
      .select({ count: count() })
      .from(itemStock)
      .where(lt(itemStock.inStorage, 5));
    
    const lowStockItems = lowStockItemsResult[0]?.count || 0;

    // Get seeded items count
    const seededItemsResult = await db
      .select({ total: sum(itemStock.seeded) })
      .from(itemStock)
      .where(gt(itemStock.seeded, 0));
    
    const seededItems = Number(seededItemsResult[0]?.total) || 0;

    // Get clearance items count (items with inClearance > 0)
    const clearanceItemsResult = await db
      .select({ count: count() })
      .from(itemStock)
      .where(gt(itemStock.inClearance, 0));
    
    const clearanceItems = clearanceItemsResult[0]?.count || 0;

    // Get pending clearance forms count
    const pendingClearanceFormsResult = await db
      .select({ count: count() })
      .from(clearanceForms)
      .where(eq(clearanceForms.status, 'pending_approval'));
    
    const pendingClearanceForms = pendingClearanceFormsResult[0]?.count || 0;

    // Get recent movements (last 7 days)
    const sevenDaysAgo = subDays(new Date(), 7);
    const recentMovementsResult = await db
      .select({ count: count() })
      .from(stockMovements)
      .where(gte(stockMovements.createdAt, sevenDaysAgo));
    
    const recentMovements = recentMovementsResult[0]?.count || 0;

    // Get stock distribution - FIX: Convert to numbers explicitly
    const stockDistributionResult = await db
      .select({
        pending: sql<string>`COALESCE(SUM(${itemStock.pending}), 0)`,
        inStorage: sql<string>`COALESCE(SUM(${itemStock.inStorage}), 0)`,
        onBorrow: sql<string>`COALESCE(SUM(${itemStock.onBorrow}), 0)`,
        inClearance: sql<string>`COALESCE(SUM(${itemStock.inClearance}), 0)`,
        seeded: sql<string>`COALESCE(SUM(${itemStock.seeded}), 0)`,
      })
      .from(itemStock);
    
    // Convert all values to numbers
    const rawData = stockDistributionResult[0];
    const stockDistribution = {
      pending: Number(rawData?.pending) || 0,
      inStorage: Number(rawData?.inStorage) || 0,
      onBorrow: Number(rawData?.onBorrow) || 0,
      inClearance: Number(rawData?.inClearance) || 0,
      seeded: Number(rawData?.seeded) || 0,
    };

    console.log('Stock Distribution (converted):', stockDistribution); // Debug log

    // Get recent activities
    const recentActivities = await db
      .select({
        id: stockMovements.id,
        type: sql<string>`CASE 
          WHEN ${stockMovements.movementType} = 'initial_stock' THEN 'Initial Stock'
          WHEN ${stockMovements.movementType} = 'borrow' THEN 'Borrow Request'
          WHEN ${stockMovements.movementType} = 'complete' THEN 'Borrow Completed'
          WHEN ${stockMovements.movementType} = 'clearance' THEN 'Clearance'
          WHEN ${stockMovements.movementType} = 'seed' THEN 'Item Seeded'
          WHEN ${stockMovements.movementType} = 'revert_seed' THEN 'Seed Reverted'
          WHEN ${stockMovements.movementType} = 'adjustment' THEN 'Stock Adjustment'
          ELSE 'Other'
        END`,
        description: items.description,
        createdAt: stockMovements.createdAt,
        performedBy: users.name
      })
      .from(stockMovements)
      .leftJoin(items, eq(stockMovements.itemId, items.productCode))
      .leftJoin(users, eq(stockMovements.performedBy, users.id))
      .orderBy(desc(stockMovements.createdAt))
      .limit(5);

    // Get user statistics
    const userStats = await db
      .select({
        role: users.role,
        count: count()
      })
      .from(users)
      .groupBy(users.role);

    // Get department statistics
    const departmentStats = await db
      .select({
        name: departments.name,
        count: count()
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .groupBy(departments.name);

    // Get location statistics
    const locationStats = await db
      .select({
        name: locations.name,
        boxCount: count(boxes.id),
        itemCount: count(itemStock.id)
      })
      .from(locations)
      .leftJoin(boxes, eq(boxes.locationId, locations.id))
      .leftJoin(itemStock, eq(itemStock.boxId, boxes.id))
      .groupBy(locations.name);

    return NextResponse.json({
      approvedItems,
      rejectedItems,
      lowStockItems,
      seededItems,
      clearanceItems,
      pendingClearanceForms,
      recentMovements,
      stockDistribution,
      recentActivities,
      userStats,
      departmentStats,
      locationStats
    });
  } catch (error) {
    console.error('Failed to fetch system overview data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch system overview data',
        approvedItems: 0,
        rejectedItems: 0,
        lowStockItems: 0,
        seededItems: 0,
        clearanceItems: 0,
        pendingClearanceForms: 0,
        recentMovements: 0,
        stockDistribution: {
          pending: 0,
          inStorage: 0,
          onBorrow: 0,
          inClearance: 0,
          seeded: 0,
        },
        recentActivities: [],
        userStats: [],
        departmentStats: [],
        locationStats: []
      },
      { status: 500 }
    );
  }
}
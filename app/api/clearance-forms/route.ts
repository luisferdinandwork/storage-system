// app/api/clearance-forms/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  clearanceForms, 
  clearanceFormItems, 
  itemStock, 
  users
} from '@/lib/db/schema';
import { eq, and, desc, sql, gt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

// Create aliases for the users table to handle multiple joins
const creatorUser = alias(users, 'creator_user');
const approverUser = alias(users, 'approver_user');
const processorUser = alias(users, 'processor_user');

// GET /api/clearance-forms - List all clearance forms
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build query conditions
    let whereCondition = sql`1=1`;
    if (status) {
      whereCondition = eq(clearanceForms.status, status as any);
    }

    // Get clearance forms with creator info
    const forms = await db
      .select({
        id: clearanceForms.id,
        formNumber: clearanceForms.formNumber,
        title: clearanceForms.title,
        description: clearanceForms.description,
        period: clearanceForms.period,
        status: clearanceForms.status,
        createdAt: clearanceForms.createdAt,
        updatedAt: clearanceForms.updatedAt,
        approvedAt: clearanceForms.approvedAt,
        processedAt: clearanceForms.processedAt,
        createdBy: {
          id: creatorUser.id,
          name: creatorUser.name,
        },
        approvedBy: {
          id: approverUser.id,
          name: approverUser.name,
        },
        processedBy: {
          id: processorUser.id,
          name: processorUser.name,
        },
        itemCount: sql<number>`count(distinct ${clearanceFormItems.id})`,
        totalQuantity: sql<number>`coalesce(sum(${clearanceFormItems.quantity}), 0)`,
      })
      .from(clearanceForms)
      .leftJoin(creatorUser, eq(clearanceForms.createdBy, creatorUser.id))
      .leftJoin(approverUser, eq(clearanceForms.approvedBy, approverUser.id))
      .leftJoin(processorUser, eq(clearanceForms.processedBy, processorUser.id))
      .leftJoin(clearanceFormItems, eq(clearanceForms.id, clearanceFormItems.formId))
      .where(whereCondition)
      .groupBy(
        clearanceForms.id,
        creatorUser.id,
        creatorUser.name,
        approverUser.id,
        approverUser.name,
        processorUser.id,
        processorUser.name
      )
      .orderBy(desc(clearanceForms.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clearanceForms)
      .where(whereCondition);

    return NextResponse.json({
      forms,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch clearance forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clearance forms' },
      { status: 500 }
    );
  }
}

// POST /api/clearance-forms - Create a new clearance form
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only storage masters can create clearance forms
    if (session.user.role !== 'storage-master' && session.user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, period, items: formItems } = body;

    if (!title || !period || !formItems || !Array.isArray(formItems) || formItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate a unique form number
    const formNumber = `CLR-${Date.now().toString().slice(-6)}`;

    // Check if email exists
    if (!session.user.email) {
      return NextResponse.json({ error: 'User email not found in session' }, { status: 401 });
    }

    // Get the current user
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create the clearance form
    const [newForm] = await db
      .insert(clearanceForms)
      .values({
        formNumber,
        title,
        description,
        period,
        status: 'draft',
        createdBy: currentUser.id,
      })
      .returning();

    // Add items to the form
    const formItemsToInsert = await Promise.all(
      formItems.map(async (item: any) => {
        // Get the stock record for this item
        const [stockRecord] = await db
          .select()
          .from(itemStock)
          .where(and(
            eq(itemStock.itemId, item.itemId),
            eq(itemStock.id, item.stockId),
            gt(itemStock.inClearance, 0)
          ))
          .limit(1);

        if (!stockRecord) {
          throw new Error(`Stock record not found for item ${item.itemId}`);
        }

        return {
          formId: newForm.id,
          itemId: item.itemId,
          stockId: item.stockId,
          quantity: Math.min(item.quantity, stockRecord.inClearance),
          condition: item.condition || stockRecord.condition,
          conditionNotes: item.conditionNotes || stockRecord.conditionNotes,
        };
      })
    );

    await db.insert(clearanceFormItems).values(formItemsToInsert);

    return NextResponse.json(newForm, { status: 201 });
  } catch (error) {
    console.error('Failed to create clearance form:', error);
    return NextResponse.json(
      { error: 'Failed to create clearance form', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
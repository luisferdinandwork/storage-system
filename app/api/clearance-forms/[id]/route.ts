// app/api/clearance-forms/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  clearanceForms, 
  clearanceFormItems,
  clearedItems,
  itemStock,
  items,
  stockMovements,
  boxes,
  locations,
  users
} from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// GET /api/clearance-forms/[id] - Get clearance form details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formId = params.id;

    // Get the clearance form using query API
    const form = await db.query.clearanceForms.findFirst({
      where: eq(clearanceForms.id, formId),
      with: {
        createdBy: {
          columns: {
            id: true,
            name: true,
          }
        },
        approvedBy: {
          columns: {
            id: true,
            name: true,
          }
        },
        processedBy: {
          columns: {
            id: true,
            name: true,
          }
        },
        items: {
          with: {
            item: true,
            stock: {
              with: {
                box: {
                  with: {
                    location: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    return NextResponse.json(form);
  } catch (error) {
    console.error('Failed to fetch clearance form details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clearance form details' },
      { status: 500 }
    );
  }
}

// PUT /api/clearance-forms/[id] - Update clearance form
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formId = params.id;
    const body = await request.json();
    const { action, rejectionReason } = body;

    if (!action || !['approve', 'reject', 'process'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, reject, or process' },
        { status: 400 }
      );
    }

    // Get current user
    if (!session.user.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 401 });
    }

    const currentUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the clearance form
    const form = await db.query.clearanceForms.findFirst({
      where: eq(clearanceForms.id, formId),
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // APPROVE ACTION
    if (action === 'approve') {
      if (!['storage-master-manager', 'superadmin'].includes(currentUser.role)) {
        return NextResponse.json({ error: 'Only managers can approve' }, { status: 403 });
      }

      if (form.status !== 'pending_approval') {
        return NextResponse.json({ error: 'Form must be pending approval' }, { status: 400 });
      }

      await db
        .update(clearanceForms)
        .set({
          status: 'approved',
          approvedBy: currentUser.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(clearanceForms.id, formId));

      return NextResponse.json({ message: 'Form approved successfully' });
    }

    // REJECT ACTION
    if (action === 'reject') {
      if (!['storage-master-manager', 'superadmin'].includes(currentUser.role)) {
        return NextResponse.json({ error: 'Only managers can reject' }, { status: 403 });
      }

      if (form.status !== 'pending_approval') {
        return NextResponse.json({ error: 'Form must be pending approval' }, { status: 400 });
      }

      if (!rejectionReason) {
        return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 });
      }

      // Get form items
      const formItems = await db.query.clearanceFormItems.findMany({
        where: eq(clearanceFormItems.formId, formId),
      });

      // Revert stock quantities using SQL
      for (const item of formItems) {
        await db
          .update(itemStock)
          .set({
            inClearance: sql`${itemStock.inClearance} - ${item.quantity}`,
            inStorage: sql`${itemStock.inStorage} + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(itemStock.id, item.stockId));

        // Record movement
        await db.insert(stockMovements).values({
          itemId: item.itemId,
          stockId: item.stockId,
          movementType: 'adjustment',
          quantity: item.quantity,
          fromState: 'clearance',
          toState: 'storage',
          referenceId: formId,
          referenceType: 'manual',
          performedBy: currentUser.id,
          notes: `Form ${form.formNumber} rejected: ${rejectionReason}`,
        });
      }

      await db
        .update(clearanceForms)
        .set({
          status: 'rejected',
          rejectionReason,
          updatedAt: new Date(),
        })
        .where(eq(clearanceForms.id, formId));

      return NextResponse.json({ message: 'Form rejected successfully' });
    }

    // PROCESS ACTION
    if (action === 'process') {
      if (!['storage-master', 'storage-master-manager', 'superadmin'].includes(currentUser.role)) {
        return NextResponse.json({ error: 'Only storage masters can process' }, { status: 403 });
      }

      if (form.status !== 'approved') {
        return NextResponse.json({ error: 'Form must be approved' }, { status: 400 });
      }

      // Get form items with all details
      const formItems = await db.query.clearanceFormItems.findMany({
        where: eq(clearanceFormItems.formId, formId),
        with: {
          item: true,
          stock: {
            with: {
              box: {
                with: {
                  location: true,
                }
              }
            }
          }
        }
      });

      // Process each item
      for (const formItem of formItems) {
        // Reduce inClearance quantity
        await db
          .update(itemStock)
          .set({
            inClearance: sql`${itemStock.inClearance} - ${formItem.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(itemStock.id, formItem.stockId));

        // Record movement
        await db.insert(stockMovements).values({
          itemId: formItem.itemId,
          stockId: formItem.stockId,
          movementType: 'clearance',
          quantity: formItem.quantity,
          fromState: 'clearance',
          toState: 'none',
          referenceId: formId,
          referenceType: 'manual',
          boxId: formItem.stock.boxId,
          performedBy: currentUser.id,
          notes: `Processed form ${form.formNumber}`,
        });

        // Create cleared item record
        if (formItem.item) {
          await db.insert(clearedItems).values({
            formId: formId,
            formNumber: form.formNumber,
            productCode: formItem.item.productCode,
            description: formItem.item.description,
            brandCode: formItem.item.brandCode,
            productDivision: formItem.item.productDivision,
            productCategory: formItem.item.productCategory,
            period: formItem.item.period,
            season: formItem.item.season,
            unitOfMeasure: formItem.item.unitOfMeasure,
            quantity: formItem.quantity,
            condition: formItem.condition,
            conditionNotes: formItem.conditionNotes,
            boxId: formItem.stock.box?.id,
            boxNumber: formItem.stock.box?.boxNumber,
            locationId: formItem.stock.box?.location?.id,
            locationName: formItem.stock.box?.location?.name,
            clearedBy: currentUser.id,
          });
        }
      }

      // Update form status
      await db
        .update(clearanceForms)
        .set({
          status: 'processed',
          processedBy: currentUser.id,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(clearanceForms.id, formId));

      return NextResponse.json({ message: 'Form processed successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to update clearance form:', error);
    return NextResponse.json(
      { error: 'Failed to update clearance form' },
      { status: 500 }
    );
  }
}

// DELETE /api/clearance-forms/[id] - Delete draft form
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formId = params.id;

    // Get current user
    if (!session.user.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 401 });
    }

    const currentUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permissions
    if (!['storage-master', 'storage-master-manager', 'superadmin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the form
    const form = await db.query.clearanceForms.findFirst({
      where: eq(clearanceForms.id, formId),
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    if (form.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft forms can be deleted' }, { status: 400 });
    }

    // Get form items
    const formItems = await db.query.clearanceFormItems.findMany({
      where: eq(clearanceFormItems.formId, formId),
    });

    // Revert stock
    for (const item of formItems) {
      await db
        .update(itemStock)
        .set({
          inClearance: sql`${itemStock.inClearance} - ${item.quantity}`,
          inStorage: sql`${itemStock.inStorage} + ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(itemStock.id, item.stockId));
    }

    // Delete form (cascade deletes items)
    await db.delete(clearanceForms).where(eq(clearanceForms.id, formId));

    return NextResponse.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Failed to delete clearance form:', error);
    return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 });
  }
}
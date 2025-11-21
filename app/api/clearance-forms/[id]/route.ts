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
  users,
  borrowRequestItems,
  itemClearances,
  itemImages,
  itemRequests
} from '@/lib/db/schema';
import { and, eq, ne, sql } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

// GET /api/clearance-forms/[id] - Get clearance form details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const formId = id;

    // Get the clearance form
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
        },
        clearedItems: {
          columns: {
            id: true,
            formId: true,
            formNumber: true,
            productCode: true,
            description: true,
            brandCode: true,
            productDivision: true,
            productCategory: true,
            period: true,
            season: true,
            unitOfMeasure: true,
            quantity: true,
            condition: true,
            conditionNotes: true,
            boxId: true,
            boxNumber: true,
            locationId: true,
            locationName: true,
            clearedAt: true,
            clearedBy: true,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const formId = id;
    const body = await request.json();
    const { action, rejectionReason } = body;

    // Update the list of valid actions
    if (!action || !['approve', 'reject', 'process', 'mark_pdf_generated'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, reject, process, or mark_pdf_generated' },
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

    // MARK PDF GENERATED ACTION
    if (action === 'mark_pdf_generated') {
      if (!['storage-master', 'storage-master-manager', 'superadmin'].includes(currentUser.role)) {
        return NextResponse.json({ error: 'Only storage masters can mark PDF as generated' }, { status: 403 });
      }

      if (form.status !== 'approved') {
        return NextResponse.json({ error: 'Form must be approved to mark PDF as generated' }, { status: 400 });
      }

      // Generate a PDF path (even though we're not actually storing it)
      const pdfPath = `/clearance-forms/generated-${form.formNumber}-${Date.now()}.pdf`;
      
      // Update form with PDF path
      await db
        .update(clearanceForms)
        .set({
          pdfPath,
          updatedAt: new Date(),
        })
        .where(eq(clearanceForms.id, formId));

      return NextResponse.json({ 
        message: 'PDF marked as generated successfully',
        pdfPath
      });
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

      // Revert stock quantities
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
          referenceId: form.formNumber,
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
        return NextResponse.json({ error: 'Only storage masters can process forms' }, { status: 403 });
      }

      if (form.status !== 'approved') {
        return NextResponse.json({ error: 'Form must be approved to process' }, { status: 400 });
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

      // Collect all item IDs to check if they can be deleted
      const itemIdsToDelete = new Set<string>();
      const deletedItems: string[] = [];
      
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
          referenceId: form.formNumber,
          referenceType: 'manual',
          boxId: formItem.stock.box?.id,
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

        // Add item ID to potential deletion list
        itemIdsToDelete.add(formItem.itemId);
      }

      // Delete items that have no remaining stock and are not referenced elsewhere
      for (const itemId of itemIdsToDelete) {
        // Check if there's any remaining stock for this item
        const remainingStock = await db.query.itemStock.findFirst({
          where: eq(itemStock.itemId, itemId),
        });

        // FIXED: Check if any stock quantity is greater than 0
        if (remainingStock && (
          remainingStock.pending > 0 || 
          remainingStock.inStorage > 0 || 
          remainingStock.onBorrow > 0 || 
          remainingStock.inClearance > 0 || 
          remainingStock.seeded > 0
        )) {
          continue;
        }

        // Check if this item is referenced in any other clearance form
        const otherFormReference = await db.query.clearanceFormItems.findFirst({
          where: and(
            eq(clearanceFormItems.itemId, itemId),
            ne(clearanceFormItems.formId, formId)
          ),
        });

        // If referenced in another form, skip deletion
        if (otherFormReference) {
          continue;
        }

        // Check if item is referenced in active borrow requests
        const activeBorrowReference = await db.query.borrowRequestItems.findFirst({
          where: and(
            eq(borrowRequestItems.itemId, itemId),
            ne(borrowRequestItems.status, 'complete'),
            ne(borrowRequestItems.status, 'seeded'),
            ne(borrowRequestItems.status, 'reverted')
          ),
        });

        // If referenced in active borrow request, skip deletion
        if (activeBorrowReference) {
          continue;
        }

        // If we get here, it's safe to delete the item and all its related records
        try {
          // Delete item images
          await db.delete(itemImages).where(eq(itemImages.itemId, itemId));
          
          // Delete item requests
          await db.delete(itemRequests).where(eq(itemRequests.itemId, itemId));
          
          // Delete borrow request items
          await db.delete(borrowRequestItems).where(eq(borrowRequestItems.itemId, itemId));
          
          // Delete item clearances
          await db.delete(itemClearances).where(eq(itemClearances.itemId, itemId));
          
          // Delete stock movements
          await db.delete(stockMovements).where(eq(stockMovements.itemId, itemId));
          
          // Delete item stock records
          await db.delete(itemStock).where(eq(itemStock.itemId, itemId));
          
          // Finally, delete the item itself
          await db.delete(items).where(eq(items.productCode, itemId));
          
          // Track that this item was deleted
          deletedItems.push(itemId);
        } catch (error) {
          console.error(`Failed to delete item ${itemId}:`, error);
        }
      }

      // MOVED: Delete clearance form items AFTER processing deletions
      await db.delete(clearanceFormItems).where(eq(clearanceFormItems.formId, formId));

      // Update form status
      await db
        .update(clearanceForms)
        .set({
          status: 'processed',
          processedBy: currentUser.id,
          processedAt: new Date(),
          physicalCheckCompleted: true,
          updatedAt: new Date(),
        })
        .where(eq(clearanceForms.id, formId));

      return NextResponse.json({ 
        message: 'Form processed successfully',
        deletedItems: deletedItems 
      });
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const formId = id;

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
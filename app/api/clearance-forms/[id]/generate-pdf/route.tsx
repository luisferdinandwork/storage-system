// app/api/clearance-forms/[id]/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  clearanceForms, 
  clearanceFormItems,
  items,
  itemStock,
  boxes,
  locations,
  users
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { renderToBuffer } from '@react-pdf/renderer';
import { ClearanceFormPDF } from '@/components/clearance/ClearanceFormPDF';

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
      return NextResponse.json({ error: 'Only storage masters can generate PDF' }, { status: 403 });
    }

    // Get the clearance form
    const form = await db.query.clearanceForms.findFirst({
      where: eq(clearanceForms.id, formId),
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    if (form.status !== 'approved') {
      return NextResponse.json({ error: 'Form must be approved to generate PDF' }, { status: 400 });
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

    // Generate the PDF
    const pdfBuffer = await renderToBuffer(
      <ClearanceFormPDF 
        form={{
          formNumber: form.formNumber,
          title: form.title,
          description: form.description,
          period: form.period
        }} 
        formItems={formItems.map(item => ({
          item: {
            productCode: item.item.productCode,
            description: item.item.description
          },
          stock: {
            box: item.stock.box ? {
              boxNumber: item.stock.box.boxNumber,
              location: item.stock.box.location ? {
                name: item.stock.box.location.name
              } : undefined
            } : null
          },
          quantity: item.quantity,
          condition: item.condition
        }))} 
        user={{
          name: currentUser.name
        }} 
      />
    );
    
    // Set response headers
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="clearance-form-${form.formNumber}.pdf"`);
    
    // Return the PDF as a response
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
// app/api/clearance-forms/submit-for-approval/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { clearanceForms, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/clearance-forms/submit-for-approval - Submit a form for approval
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { formId } = body;

    if (!formId) {
      return NextResponse.json(
        { error: 'Form ID is required' },
        { status: 400 }
      );
    }

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

    // Get the form
    const [form] = await db
      .select()
      .from(clearanceForms)
      .where(eq(clearanceForms.id, formId))
      .limit(1);

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Check if user is the creator
    if (form.createdBy !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if form is in draft status
    if (form.status !== 'draft') {
      return NextResponse.json(
        { error: 'Form is not in draft status' },
        { status: 400 }
      );
    }

    // Update form status to pending approval
    await db
      .update(clearanceForms)
      .set({
        status: 'pending_approval',
      })
      .where(eq(clearanceForms.id, formId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to submit form for approval:', error);
    return NextResponse.json(
      { error: 'Failed to submit form for approval' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// In a real application, you would store these in a database
// For now, we'll use in-memory storage
let systemSettings = {
  maxBorrowDays: 14,
  requireDualApproval: true,
  autoRemindReturn: true,
  reminderDays: 2,
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== 'admin' && session.user.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(systemSettings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json({ error: 'Failed to fetch system settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await request.json();
    
    // Validate settings
    if (settings.maxBorrowDays < 1 || settings.maxBorrowDays > 30) {
      return NextResponse.json({ error: 'Maximum borrow days must be between 1 and 30' }, { status: 400 });
    }
    
    if (settings.reminderDays < 1 || settings.reminderDays > 7) {
      return NextResponse.json({ error: 'Reminder days must be between 1 and 7' }, { status: 400 });
    }

    // Update system settings
    systemSettings = {
      ...systemSettings,
      ...settings,
    };

    return NextResponse.json(systemSettings);
  } catch (error) {
    console.error('Error updating system settings:', error);
    return NextResponse.json({ error: 'Failed to update system settings' }, { status: 500 });
  }
}
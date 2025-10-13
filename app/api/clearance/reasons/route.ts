import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return predefined clearance reasons
    const clearanceReasons = [
      {
        id: 'seeding',
        name: 'Seeding',
        description: 'Item not returned by user (lost or damaged)',
        requiresApproval: true,
        canRevert: true,
      },
      {
        id: 'damaged',
        name: 'Damaged',
        description: 'Item returned in damaged condition',
        requiresApproval: true,
        canRevert: false,
      },
      {
        id: 'expired',
        name: 'Expired',
        description: 'Item has expired or reached end of life',
        requiresApproval: true,
        canRevert: false,
      },
      {
        id: 'obsolete',
        name: 'Obsolete',
        description: 'Item is no longer needed or useful',
        requiresApproval: true,
        canRevert: false,
      },
      {
        id: 'recall',
        name: 'Recall',
        description: 'Item recalled due to safety or quality issues',
        requiresApproval: true,
        canRevert: false,
      },
      {
        id: 'other',
        name: 'Other',
        description: 'Other reasons for clearance',
        requiresApproval: true,
        canRevert: false,
      },
    ];

    return NextResponse.json(clearanceReasons);
  } catch (error) {
    console.error('Error fetching clearance reasons:', error);
    return NextResponse.json({ error: 'Failed to fetch clearance reasons' }, { status: 500 });
  }
}
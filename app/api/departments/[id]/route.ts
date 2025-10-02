import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { departments, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const deptId = params.id;
    
    // Update department
    const updatedDept = await db.update(departments)
      .set({
        name,
        description: description || null,
        updatedAt: new Date(),
      })
      .where(eq(departments.id, deptId))
      .returning();

    if (!updatedDept.length) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    return NextResponse.json(updatedDept[0]);
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deptId = params.id;
    
    // Check if there are users in this department
    const usersInDept = await db.select().from(users).where(eq(users.departmentId, deptId)).limit(1);
    
    if (usersInDept.length) {
      return NextResponse.json({ 
        error: 'Cannot delete department with assigned users. Please reassign users first.' 
      }, { status: 400 });
    }

    // Delete department
    const deletedDept = await db.delete(departments).where(eq(departments.id, deptId)).returning({
      id: departments.id,
      name: departments.name,
    });

    if (!deletedDept.length) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
  }
}
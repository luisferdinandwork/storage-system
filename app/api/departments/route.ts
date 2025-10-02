import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { departments, users } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allDepartments = await db.select({
      id: departments.id,
      name: departments.name,
      description: departments.description,
      createdAt: departments.createdAt,
      userCount: count(users.id),
    })
    .from(departments)
    .leftJoin(users, eq(departments.id, users.departmentId))
    .groupBy(departments.id);
    
    return NextResponse.json(allDepartments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    // Check if department already exists
    const existingDept = await db.select().from(departments).where(eq(departments.name, name)).limit(1);
    
    if (existingDept.length) {
      return NextResponse.json({ error: 'Department with this name already exists' }, { status: 400 });
    }

    // Create new department
    const newDepartment = await db.insert(departments).values({
      name,
      description: description || null,
    }).returning();

    return NextResponse.json(newDepartment[0], { status: 201 });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
  }
}
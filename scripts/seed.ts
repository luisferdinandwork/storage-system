// scripts/seed.ts

import 'dotenv/config';
import { db } from '../lib/db';
import { users, items, itemSizes, departments } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    // Delete all existing data first (in correct order to respect foreign key constraints)
    console.log('Removing all existing data...');
    await db.delete(itemSizes);
    await db.delete(items);
    await db.delete(users);
    await db.delete(departments);
    console.log('All data removed successfully');

    // Create departments
    console.log('Creating departments...');
    const [hrDept] = await db.insert(departments).values({
      name: 'Human Resources',
      description: 'Responsible for employee management and relations',
    }).returning();

    const [itDept] = await db.insert(departments).values({
      name: 'Information Technology',
      description: 'Manages technology infrastructure and support',
    }).returning();

    console.log('Departments created successfully');

    // Create admin user
    console.log('Creating admin user...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const [adminUser] = await db.insert(users).values({
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
      // Admin doesn't belong to any specific department
    }).returning();
    console.log('Admin user created');

    // Create department managers
    console.log('Creating department managers...');
    const hrManagerPassword = await bcrypt.hash('manager123', 10);
    const [hrManager] = await db.insert(users).values({
      name: 'HR Manager',
      email: 'hr.manager@example.com',
      password: hrManagerPassword,
      role: 'manager',
      departmentId: hrDept.id,
    }).returning();

    const itManagerPassword = await bcrypt.hash('manager123', 10);
    const [itManager] = await db.insert(users).values({
      name: 'IT Manager',
      email: 'it.manager@example.com',
      password: itManagerPassword,
      role: 'manager',
      departmentId: itDept.id,
    }).returning();
    console.log('Department managers created');

    // Create regular users for each department
    console.log('Creating regular users...');
    const userPassword = await bcrypt.hash('user123', 10);
    
    const [hrUser] = await db.insert(users).values({
      name: 'HR Specialist',
      email: 'hr.specialist@example.com',
      password: userPassword,
      role: 'user',
      departmentId: hrDept.id,
    }).returning();

    const [itUser] = await db.insert(users).values({
      name: 'IT Specialist',
      email: 'it.specialist@example.com',
      password: userPassword,
      role: 'user',
      departmentId: itDept.id,
    }).returning();

    console.log('Regular users created');

    // Create items with categories and sizes
    console.log('Creating items...');
    const itemsData = [
      { name: 'Running Shoes', description: 'Comfortable running shoes for daily exercise', category: 'shoes' as const },
      { name: 'T-Shirt', description: 'Comfortable cotton t-shirt', category: 'apparel' as const },
      { name: 'Watch', description: 'Elegant wristwatch', category: 'accessories' as const },
      { name: 'Tennis Racket', description: 'Professional tennis racket', category: 'equipment' as const },
      { name: 'Laptop', description: 'High-performance laptop for work', category: 'equipment' as const },
    ];

    const createdItems = await db.insert(items).values(
      itemsData.map(item => ({
        ...item,
        addedBy: adminUser.id,
      }))
    ).returning();

    console.log('Items created successfully');

    // Create item sizes for each item
    console.log('Creating item sizes...');
    const itemSizesData = [
      // Running Shoes sizes
      { itemId: createdItems[0].id, size: 'US 9', quantity: 5, available: 5 },
      { itemId: createdItems[0].id, size: 'US 10', quantity: 3, available: 3 },
      
      // T-Shirt sizes
      { itemId: createdItems[1].id, size: 'M', quantity: 10, available: 10 },
      { itemId: createdItems[1].id, size: 'L', quantity: 8, available: 8 },
      
      // Watch sizes
      { itemId: createdItems[2].id, size: 'One Size', quantity: 3, available: 3 },
      
      // Tennis Racket sizes
      { itemId: createdItems[3].id, size: 'Standard', quantity: 4, available: 4 },
      
      // Laptop sizes
      { itemId: createdItems[4].id, size: 'Standard', quantity: 2, available: 2 },
    ];

    await db.insert(itemSizes).values(itemSizesData);
    console.log('Item sizes created successfully');

    console.log('Seed data created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
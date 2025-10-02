// scripts/seed.ts

import 'dotenv/config';
import { db } from '../lib/db';
import { users, items, departments } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    // Delete all existing items first
    console.log('Removing all existing items...');
    await db.delete(items);
    console.log('All items removed successfully');

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

    const [financeDept] = await db.insert(departments).values({
      name: 'Finance',
      description: 'Handles financial planning and management',
    }).returning();

    const [marketingDept] = await db.insert(departments).values({
      name: 'Marketing',
      description: 'Responsible for marketing and communications',
    }).returning();

    console.log('Departments created successfully');

    // Check if admin user already exists
    const existingAdmin = await db.select().from(users).where(eq(users.email, 'admin@example.com')).limit(1);
    
    let adminUser, hrManager, itManager, financeManager, marketingManager, regularUser;

    if (existingAdmin.length === 0) {
      // Create admin user
      const adminPassword = await bcrypt.hash('admin123', 10);
      [adminUser] = await db.insert(users).values({
        name: 'Admin User',
        email: 'admin@example.com',
        password: adminPassword,
        role: 'admin',
        // Admin doesn't belong to any specific department
      }).returning();
      console.log('Admin user created');
    } else {
      adminUser = existingAdmin[0];
      console.log('Admin user already exists');
    }

    // Create department managers
    const hrManagerPassword = await bcrypt.hash('manager123', 10);
    [hrManager] = await db.insert(users).values({
      name: 'HR Manager',
      email: 'hr.manager@example.com',
      password: hrManagerPassword,
      role: 'manager',
      departmentId: hrDept.id,
    }).returning();

    const itManagerPassword = await bcrypt.hash('manager123', 10);
    [itManager] = await db.insert(users).values({
      name: 'IT Manager',
      email: 'it.manager@example.com',
      password: itManagerPassword,
      role: 'manager',
      departmentId: itDept.id,
    }).returning();

    const financeManagerPassword = await bcrypt.hash('manager123', 10);
    [financeManager] = await db.insert(users).values({
      name: 'Finance Manager',
      email: 'finance.manager@example.com',
      password: financeManagerPassword,
      role: 'manager',
      departmentId: financeDept.id,
    }).returning();

    const marketingManagerPassword = await bcrypt.hash('manager123', 10);
    [marketingManager] = await db.insert(users).values({
      name: 'Marketing Manager',
      email: 'marketing.manager@example.com',
      password: marketingManagerPassword,
      role: 'manager',
      departmentId: marketingDept.id,
    }).returning();

    console.log('Department managers created');

    // Create regular users for each department
    const userPassword = await bcrypt.hash('user123', 10);
    
    const [hrUser1] = await db.insert(users).values({
      name: 'HR Specialist',
      email: 'hr.specialist@example.com',
      password: userPassword,
      role: 'user',
      departmentId: hrDept.id,
    }).returning();

    const [hrUser2] = await db.insert(users).values({
      name: 'HR Assistant',
      email: 'hr.assistant@example.com',
      password: userPassword,
      role: 'user',
      departmentId: hrDept.id,
    }).returning();

    const [itUser1] = await db.insert(users).values({
      name: 'IT Specialist',
      email: 'it.specialist@example.com',
      password: userPassword,
      role: 'user',
      departmentId: itDept.id,
    }).returning();

    const [itUser2] = await db.insert(users).values({
      name: 'IT Support',
      email: 'it.support@example.com',
      password: userPassword,
      role: 'user',
      departmentId: itDept.id,
    }).returning();

    const [financeUser1] = await db.insert(users).values({
      name: 'Finance Analyst',
      email: 'finance.analyst@example.com',
      password: userPassword,
      role: 'user',
      departmentId: financeDept.id,
    }).returning();

    const [financeUser2] = await db.insert(users).values({
      name: 'Accountant',
      email: 'accountant@example.com',
      password: userPassword,
      role: 'user',
      departmentId: financeDept.id,
    }).returning();

    const [marketingUser1] = await db.insert(users).values({
      name: 'Marketing Specialist',
      email: 'marketing.specialist@example.com',
      password: userPassword,
      role: 'user',
      departmentId: marketingDept.id,
    }).returning();

    const [marketingUser2] = await db.insert(users).values({
      name: 'Content Creator',
      email: 'content.creator@example.com',
      password: userPassword,
      role: 'user',
      departmentId: marketingDept.id,
    }).returning();

    console.log('Regular users created');

    // Create items with categories and sizes
    const itemsData: Array<{
      name: string;
      description: string;
      category: 'shoes' | 'apparel' | 'accessories' | 'equipment';
      size: string;
      quantity: number;
      addedBy: string;
    }> = [
      // Shoes
      { name: 'Running Shoes', description: 'Comfortable running shoes for daily exercise', category: 'shoes', size: 'US 9', quantity: 5, addedBy: adminUser.id },
      { name: 'Basketball Shoes', description: 'High-performance basketball shoes', category: 'shoes', size: 'US 10', quantity: 3, addedBy: adminUser.id },
      { name: 'Hiking Boots', description: 'Durable hiking boots for outdoor adventures', category: 'shoes', size: 'US 8', quantity: 4, addedBy: adminUser.id },
      { name: 'Formal Shoes', description: 'Elegant formal shoes for special occasions', category: 'shoes', size: 'US 11', quantity: 2, addedBy: adminUser.id },
      { name: 'Sneakers', description: 'Casual sneakers for everyday wear', category: 'shoes', size: 'US 7', quantity: 6, addedBy: adminUser.id },
      
      // Apparel
      { name: 'T-Shirt', description: 'Comfortable cotton t-shirt', category: 'apparel', size: 'M', quantity: 10, addedBy: adminUser.id },
      { name: 'Jeans', description: 'Classic denim jeans', category: 'apparel', size: '32', quantity: 8, addedBy: adminUser.id },
      { name: 'Jacket', description: 'Warm winter jacket', category: 'apparel', size: 'L', quantity: 5, addedBy: adminUser.id },
      { name: 'Shorts', description: 'Athletic shorts for sports', category: 'apparel', size: 'S', quantity: 7, addedBy: adminUser.id },
      { name: 'Dress Shirt', description: 'Formal dress shirt for business meetings', category: 'apparel', size: 'XL', quantity: 4, addedBy: adminUser.id },
      
      // Accessories
      { name: 'Watch', description: 'Elegant wristwatch', category: 'accessories', size: 'One Size', quantity: 3, addedBy: adminUser.id },
      { name: 'Belt', description: 'Genuine leather belt', category: 'accessories', size: '36', quantity: 6, addedBy: adminUser.id },
      { name: 'Sunglasses', description: 'UV protection sunglasses', category: 'accessories', size: 'One Size', quantity: 8, addedBy: adminUser.id },
      { name: 'Wallet', description: 'Leather wallet with multiple card slots', category: 'accessories', size: 'One Size', quantity: 10, addedBy: adminUser.id },
      { name: 'Scarf', description: 'Warm wool scarf for winter', category: 'accessories', size: 'One Size', quantity: 5, addedBy: adminUser.id },
      
      // Equipment
      { name: 'Tennis Racket', description: 'Professional tennis racket', category: 'equipment', size: 'Standard', quantity: 4, addedBy: adminUser.id },
      { name: 'Golf Clubs', description: 'Complete set of golf clubs', category: 'equipment', size: 'Standard', quantity: 2, addedBy: adminUser.id },
      { name: 'Camping Tent', description: '4-person camping tent', category: 'equipment', size: '4 Person', quantity: 3, addedBy: adminUser.id },
      { name: 'Camera', description: 'Digital camera for photography', category: 'equipment', size: 'Standard', quantity: 2, addedBy: adminUser.id },
      { name: 'Bicycle', description: 'Mountain bike for off-road adventures', category: 'equipment', size: 'Medium', quantity: 3, addedBy: adminUser.id },
    ];

    await db.insert(items).values(itemsData);
    console.log('Items created successfully');

    console.log('Seed data created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
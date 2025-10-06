// scripts/reset.ts

import 'dotenv/config';
import { db } from '../lib/db';
import { users, items, borrowRequests, itemRemovals } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function reset() {
  try {
    console.log('Resetting database...');
    
    // Delete all data in reverse order of dependencies
    await db.delete(itemRemovals);
    await db.delete(borrowRequests);
    await db.delete(items);
    await db.delete(users);
    
    console.log('Database reset successfully');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const [adminUser] = await db.insert(users).values({
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
    }).returning();

    // Create manager user
    const managerPassword = await bcrypt.hash('manager123', 10);
    const [managerUser] = await db.insert(users).values({
      name: 'Manager User',
      email: 'manager@example.com',
      password: managerPassword,
      role: 'manager',
    }).returning();

    // Create regular user
    const userPassword = await bcrypt.hash('user123', 10);
    const [regularUser] = await db.insert(users).values({
      name: 'Regular User',
      email: 'user@example.com',
      password: userPassword,
      role: 'user',
    }).returning();

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

    console.log('Database reset and seed data created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

reset();
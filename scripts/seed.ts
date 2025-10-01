import 'dotenv/config'; // Add this line at the very top
import { db } from '../lib/db';
import { users } from '../lib/db/schema';
import bcrypt from 'bcryptjs';

async function seed() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await db.insert(users).values({
    name: 'Admin User',
    email: 'admin@example.com',
    password: adminPassword,
    role: 'admin',
  });

  // Create manager user
  const managerPassword = await bcrypt.hash('manager123', 10);
  await db.insert(users).values({
    name: 'Manager User',
    email: 'manager@example.com',
    password: managerPassword,
    role: 'manager',
  });

  // Create regular user
  const userPassword = await bcrypt.hash('user123', 10);
  await db.insert(users).values({
    name: 'Regular User',
    email: 'user@example.com',
    password: userPassword,
    role: 'user',
  });

  console.log('Seed data created successfully');
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
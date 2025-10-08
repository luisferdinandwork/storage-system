import 'dotenv/config';
import { db } from '../lib/db';
import { users, items, departments, itemImages } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    // Delete all existing data first (in correct order to respect foreign key constraints)
    console.log('Removing all existing data...');
    await db.delete(itemImages);
    await db.delete(items);
    await db.delete(users);
    await db.delete(departments);
    console.log('All data removed successfully');

    // Create departments
    console.log('Creating departments...');
    const [sportsDept] = await db.insert(departments).values({
      name: 'Sports Department',
      description: 'Manages all sports equipment and facilities',
    }).returning();

    const [adminDept] = await db.insert(departments).values({
      name: 'Administration',
      description: 'Administrative department for overall management',
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
      departmentId: adminDept.id,
    }).returning();
    console.log('Admin user created');

    // Create department managers
    console.log('Creating department managers...');
    const sportsManagerPassword = await bcrypt.hash('manager123', 10);
    const [sportsManager] = await db.insert(users).values({
      name: 'Sports Manager',
      email: 'sports.manager@example.com',
      password: sportsManagerPassword,
      role: 'manager',
      departmentId: sportsDept.id,
    }).returning();
    console.log('Department managers created');

    // Create regular users for sports department
    console.log('Creating regular users...');
    const userPassword = await bcrypt.hash('user123', 10);
    
    const [sportsUser] = await db.insert(users).values({
      name: 'Sports Specialist',
      email: 'sports.specialist@example.com',
      password: userPassword,
      role: 'user',
      departmentId: sportsDept.id,
    }).returning();

    console.log('Regular users created');

    // Create sports equipment items using the new schema format
    console.log('Creating sports equipment items...');
    const itemsData = [
      {
        productCode: 'SPE1000001',
        description: 'TEMPO SHIPYARD/EGRET/DOESKIN',
        brandCode: 'SPE',
        productGroup: 'SHO',
        productDivision: 'FTW',
        productCategory: 'LST',
        inventory: 35,
        vendor: 'PT UNIMITRA',
        period: '24Q1',
        season: 'SS',
        gender: 'M',
        mould: 'PRM 096',
        tier: 'PRO',
        silo: 'LIFESTYLE',
        location: 'Storage 1' as const,
        unitOfMeasure: 'PRS' as const,
        condition: 'excellent' as const,
        conditionNotes: 'Brand new in box'
      },
      {
        productCode: 'SPE1000002',
        description: 'TEMPO SHADED SPRUCE/EGRET/DOESKIN',
        brandCode: 'SPE',
        productGroup: 'SHO',
        productDivision: 'FTW',
        productCategory: 'LST',
        inventory: 2,
        vendor: 'PT UNIMITRA',
        period: '24Q1',
        season: 'SS',
        gender: 'M',
        mould: 'PRM 096',
        tier: 'PRO',
        silo: 'LIFESTYLE',
        location: 'Storage 2' as const,
        unitOfMeasure: 'PRS' as const,
        condition: 'good' as const,
        conditionNotes: 'Minor scuff marks on sole'
      },
      {
        productCode: 'SPE1000003',
        description: 'TEMPO INDIA INK/EGRET/DOESKIN',
        brandCode: 'SPE',
        productGroup: 'SHO',
        productDivision: 'FTW',
        productCategory: 'LST',
        inventory: 67,
        vendor: 'PT UNIMITRA',
        period: '24Q1',
        season: 'SS',
        gender: 'M',
        mould: 'PRM 096',
        tier: 'PRO',
        silo: 'LIFESTYLE',
        location: 'Storage 3' as const,
        unitOfMeasure: 'PRS' as const,
        condition: 'good' as const,
        conditionNotes: 'Display model, slight wear'
      },
      {
        productCode: 'SPE1000004',
        description: 'TEMPO JUNGLE GREEN/INDIA INK/BRIGHT AQUA',
        brandCode: 'SPE',
        productGroup: 'SHO',
        productDivision: 'FTW',
        productCategory: 'LST',
        inventory: 1,
        vendor: 'PT UNIMITRA',
        period: '24Q1',
        season: 'SS',
        gender: 'M',
        mould: 'PRM 096',
        tier: 'PRO',
        silo: 'LIFESTYLE',
        location: 'Storage 1' as const,
        unitOfMeasure: 'PRS' as const,
        condition: 'fair' as const,
        conditionNotes: 'Heel wear, needs replacement soon'
      },
      {
        productCode: 'SPE1000006',
        description: '303_EARTHOVER FORGED IRON/PEARL CITY',
        brandCode: 'SPE',
        productGroup: 'SHO',
        productDivision: 'FTW',
        productCategory: 'LST',
        inventory: 2,
        vendor: 'PT UNIMITRA',
        period: '24Q1',
        season: 'SS',
        gender: 'M',
        mould: 'PRM 096',
        tier: 'PRO',
        silo: 'LIFESTYLE',
        location: 'Storage 2' as const,
        unitOfMeasure: 'PRS' as const,
        condition: 'excellent' as const,
        conditionNotes: 'New collection'
      },
      {
        productCode: 'SPE1000007',
        description: '303_EARTHOVER BLUE ODDYSEY/VANILLA ICE',
        brandCode: 'SPE',
        productGroup: 'SHO',
        productDivision: 'FTW',
        productCategory: 'LST',
        inventory: 2,
        vendor: 'PT UNIMITRA',
        period: '24Q1',
        season: 'SS',
        gender: 'M',
        mould: 'PRM 096',
        tier: 'PRO',
        silo: 'LIFESTYLE',
        location: 'Storage 3' as const,
        unitOfMeasure: 'PRS' as const,
        condition: 'good' as const,
        conditionNotes: 'No original box'
      },
      // Add more items with different categories
      {
        productCode: 'ACC1000001',
        description: 'SPORTS WATCH PROFESSIONAL',
        brandCode: 'ACC',
        productGroup: 'ACC',
        productDivision: 'FTW',
        productCategory: 'ACC',
        inventory: 15,
        vendor: 'SPORTS GEAR INC',
        period: '24Q1',
        season: 'SS',
        gender: 'U',
        mould: 'ACC 001',
        tier: 'PRO',
        silo: 'SPORTS',
        location: 'Storage 1' as const,
        unitOfMeasure: 'PCS' as const,
        condition: 'excellent' as const,
        conditionNotes: 'With original packaging'
      },
      {
        productCode: 'EQU1000001',
        description: 'TENNIS RACKET PROFESSIONAL',
        brandCode: 'EQU',
        productGroup: 'TEN',
        productDivision: 'FTW',
        productCategory: 'EQU',
        inventory: 8,
        vendor: 'TENNIS PRO',
        period: '24Q1',
        season: 'SS',
        gender: 'U',
        mould: 'TEN 045',
        tier: 'PRO',
        silo: 'SPORTS',
        location: 'Storage 2' as const,
        unitOfMeasure: 'PCS' as const,
        condition: 'good' as const,
        conditionNotes: 'String tension needs adjustment'
      },
      {
        productCode: 'APP1000001',
        description: 'SPORTS JERSEY TEAM EDITION',
        brandCode: 'APP',
        productGroup: 'APP',
        productDivision: 'FTW',
        productCategory: 'APP',
        inventory: 25,
        vendor: 'SPORTSWEAR CO',
        period: '24Q1',
        season: 'SS',
        gender: 'U',
        mould: 'APP 012',
        tier: 'STD',
        silo: 'SPORTS',
        location: 'Storage 3' as const,
        unitOfMeasure: 'PCS' as const,
        condition: 'good' as const,
        conditionNotes: 'Minor fabric pilling'
      },
      {
        productCode: 'APP1000002',
        description: 'SPORTS SHORTS COMFORT FIT',
        brandCode: 'APP',
        productGroup: 'APP',
        productDivision: 'FTW',
        productCategory: 'APP',
        inventory: 30,
        vendor: 'SPORTSWEAR CO',
        period: '24Q1',
        season: 'SS',
        gender: 'U',
        mould: 'APP 013',
        tier: 'STD',
        silo: 'SPORTS',
        location: 'Storage 1' as const,
        unitOfMeasure: 'PCS' as const,
        condition: 'excellent' as const,
        conditionNotes: 'New with tags'
      }
    ];

    const createdItems = await db.insert(items).values(
      itemsData.map(item => ({
        ...item,
        createdBy: adminUser.id,
      }))
    ).returning();

    console.log('Items created successfully');

    // Create item images (using placeholder URLs since we're not actually uploading files)
    console.log('Creating item images...');
    for (const item of createdItems) {
      await db.insert(itemImages).values({
        itemId: item.id,
        fileName: `${item.productCode}-1.jpg`,
        originalName: `${item.description} - Image 1.jpg`,
        mimeType: 'image/jpeg',
        size: 1024000, // 1MB placeholder
        altText: `${item.description} - Image 1`,
        isPrimary: true,
      });
      
      // Add a second image for some items
      if (Math.random() > 0.5) {
        await db.insert(itemImages).values({
          itemId: item.id,
          fileName: `${item.productCode}-2.jpg`,
          originalName: `${item.description} - Image 2.jpg`,
          mimeType: 'image/jpeg',
          size: 1024000, // 1MB placeholder
          altText: `${item.description} - Image 2`,
          isPrimary: false,
        });
      }
    }
    console.log('Item images created successfully');

    console.log('Seed data created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
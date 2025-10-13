import 'dotenv/config';
import { db } from '../lib/db';
import { users, items, departments, itemImages, itemRequests } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { parseProductCode } from '../lib/db/schema';

async function seed() {
  try {
    // Delete all existing data first (in correct order to respect foreign key constraints)
    console.log('Removing all existing data...');
    await db.delete(itemRequests);
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

    const [storageDept] = await db.insert(departments).values({
      name: 'Storage Management',
      description: 'Manages all storage facilities and inventory',
    }).returning();

    console.log('Departments created successfully');

    // Create superadmin user
    console.log('Creating superadmin user...');
    const superadminPassword = await bcrypt.hash('superadmin123', 10);
    const [superadminUser] = await db.insert(users).values({
      name: 'Super Admin',
      email: 'superadmin@example.com',
      password: superadminPassword,
      role: 'superadmin',
      departmentId: adminDept.id,
    }).returning();
    console.log('Superadmin user created');

    // Create storage master manager
    console.log('Creating storage master manager...');
    const storageManagerPassword = await bcrypt.hash('storagemanager123', 10);
    const [storageManager] = await db.insert(users).values({
      name: 'Storage Master Manager',
      email: 'storage.manager@example.com',
      password: storageManagerPassword,
      role: 'storage-master-manager',
      departmentId: storageDept.id,
    }).returning();
    console.log('Storage master manager created');

    // Create storage master
    console.log('Creating storage master...');
    const storageMasterPassword = await bcrypt.hash('storagemaster123', 10);
    const [storageMaster1] = await db.insert(users).values({
      name: 'Storage Master',
      email: 'storage.master@example.com',
      password: storageMasterPassword,
      role: 'storage-master',
      departmentId: storageDept.id,
    }).returning();
    console.log('Storage master created');

    // Create item master
    console.log('Creating item master...');
    const itemMasterPassword = await bcrypt.hash('itemmaster123', 10);
    const [itemMaster1] = await db.insert(users).values({
      name: 'Item Master',
      email: 'item.master@example.com',
      password: itemMasterPassword,
      role: 'item-master',
      departmentId: storageDept.id,
    }).returning();
    console.log('Item master created');

    // Create department manager
    console.log('Creating department manager...');
    const sportsManagerPassword = await bcrypt.hash('manager123', 10);
    const [sportsManager] = await db.insert(users).values({
      name: 'Sports Manager',
      email: 'sports.manager@example.com',
      password: sportsManagerPassword,
      role: 'manager',
      departmentId: sportsDept.id,
    }).returning();
    console.log('Department manager created');

    // Create regular users
    console.log('Creating regular users...');
    const userPassword = await bcrypt.hash('user123', 10);
    
    const [sportsUser1] = await db.insert(users).values({
      name: 'Sports Specialist 1',
      email: 'sports.specialist1@example.com',
      password: userPassword,
      role: 'user',
      departmentId: sportsDept.id,
    }).returning();

    const [sportsUser2] = await db.insert(users).values({
      name: 'Sports Specialist 2',
      email: 'sports.specialist2@example.com',
      password: userPassword,
      role: 'user',
      departmentId: sportsDept.id,
    }).returning();

    console.log('Regular users created');

    // Create 10 sports equipment items using the new schema format
    console.log('Creating sports equipment items...');
    const itemsData = [
      {
        productCode: 'SPE110000001',
        description: 'TEMPO SHIPYARD/EGRET/DOESKIN Lifestyle Shoes',
        inventory: 35,
        period: '24Q1',
        season: 'SS',
        unitOfMeasure: 'PRS' as const,
        condition: 'excellent' as const,
        conditionNotes: 'Brand new in box',
        status: 'pending_approval' as const,
        createdBy: itemMaster1.id,
      },
      {
        productCode: 'SPE110100001',
        description: 'TEMPO SHADED SPRUCE/EGRET/DOESKIN Football Shoes',
        inventory: 2,
        period: '24Q1',
        season: 'SS',
        unitOfMeasure: 'PRS' as const,
        condition: 'good' as const,
        conditionNotes: 'Minor scuff marks on sole',
        status: 'pending_approval' as const,
        createdBy: itemMaster1.id,
      },
      {
        productCode: 'SPE110200001',
        description: 'TEMPO INDIA INK/EGRET/DOESKIN Futsal Shoes',
        inventory: 67,
        period: '24Q1',
        season: 'SS',
        unitOfMeasure: 'PRS' as const,
        condition: 'good' as const,
        conditionNotes: 'Display model, slight wear',
        status: 'approved' as const,
        approvedBy: storageMaster1.id,
        approvedAt: new Date(),
        location: 'Storage 1' as const,
        createdBy: itemMaster1.id,
      },
      {
        productCode: 'SPE110300001',
        description: 'TEMPO JUNGLE GREEN/INDIA INK/BRIGHT AQUA Street Soccer Shoes',
        inventory: 1,
        period: '24Q1',
        season: 'SS',
        unitOfMeasure: 'PRS' as const,
        condition: 'fair' as const,
        conditionNotes: 'Heel wear, needs replacement soon',
        status: 'available' as const,
        approvedBy: storageMaster1.id,
        approvedAt: new Date(),
        location: 'Storage 2' as const,
        createdBy: itemMaster1.id,
      },
      {
        productCode: 'SPE110400001',
        description: '303_EARTHOVER FORGED IRON/PEARL CITY Running Shoes',
        inventory: 2,
        period: '24Q1',
        season: 'SS',
        unitOfMeasure: 'PRS' as const,
        condition: 'excellent' as const,
        conditionNotes: 'New collection',
        status: 'available' as const,
        approvedBy: storageMaster1.id,
        approvedAt: new Date(),
        location: 'Storage 3' as const,
        createdBy: itemMaster1.id,
      },
      {
        productCode: 'SPE110500001',
        description: '303_EARTHOVER BLUE ODDYSEY/VANILLA ICE Training Shoes',
        inventory: 2,
        period: '24Q1',
        season: 'SS',
        unitOfMeasure: 'PRS' as const,
        condition: 'good' as const,
        conditionNotes: 'No original box',
        status: 'borrowed' as const,
        approvedBy: storageMaster1.id,
        approvedAt: new Date(),
        location: 'Storage 1' as const,
        createdBy: itemMaster1.id,
      },
      {
        productCode: 'SPE130000001',
        description: 'SPORTS WATCH PROFESSIONAL',
        inventory: 15,
        period: '24Q1',
        season: 'SS',
        unitOfMeasure: 'PCS' as const,
        condition: 'excellent' as const,
        conditionNotes: 'With original packaging',
        status: 'available' as const,
        approvedBy: storageMaster1.id,
        approvedAt: new Date(),
        location: 'Storage 2' as const,
        createdBy: itemMaster1.id,
      },
      {
        productCode: 'SPE140000001',
        description: 'TENNIS RACKET PROFESSIONAL',
        inventory: 8,
        period: '24Q1',
        season: 'SS',
        unitOfMeasure: 'PCS' as const,
        condition: 'good' as const,
        conditionNotes: 'String tension needs adjustment',
        status: 'available' as const,
        approvedBy: storageMaster1.id,
        approvedAt: new Date(),
        location: 'Storage 3' as const,
        createdBy: itemMaster1.id,
      },
      {
        productCode: 'SPE120000001',
        description: 'SPORTS JERSEY TEAM EDITION',
        inventory: 25,
        period: '24Q1',
        season: 'SS',
        unitOfMeasure: 'PCS' as const,
        condition: 'good' as const,
        conditionNotes: 'Minor fabric pilling',
        status: 'available' as const,
        approvedBy: storageMaster1.id,
        approvedAt: new Date(),
        location: 'Storage 1' as const,
        createdBy: itemMaster1.id,
      },
      {
        productCode: 'SPE120000002',
        description: 'SPORTS SHORTS COMFORT FIT',
        inventory: 30,
        period: '24Q1',
        season: 'SS',
        unitOfMeasure: 'PCS' as const,
        condition: 'excellent' as const,
        conditionNotes: 'New with tags',
        status: 'available' as const,
        approvedBy: storageMaster1.id,
        approvedAt: new Date(),
        location: 'Storage 2' as const,
        createdBy: itemMaster1.id,
      }
    ];

    // Process items to extract brandCode, productDivision, and productCategory from productCode
    const processedItems = itemsData.map(item => {
      const parsed = parseProductCode(item.productCode);
      if (!parsed.isValid) {
        console.error(`Invalid product code: ${item.productCode}`, parsed.error);
        throw new Error(`Invalid product code: ${item.productCode}`);
      }
      
      return {
        ...item,
        brandCode: parsed.brandCode,
        productDivision: parsed.productDivision,
        productCategory: parsed.productCategory,
      };
    });

    const createdItems = await db.insert(items).values(processedItems).returning();

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

    // Create item requests for pending items
    console.log('Creating item requests...');
    for (const item of createdItems) {
      if (item.status === 'pending_approval') {
        await db.insert(itemRequests).values({
          itemId: item.id,
          requestedBy: item.createdBy,
          status: 'pending',
          notes: 'Please review and approve this item for storage location assignment',
        });
      }
    }
    console.log('Item requests created successfully');

    console.log('Seed data created successfully');
    console.log('\nLogin credentials:');
    console.log('Superadmin: superadmin@example.com / superadmin123');
    console.log('Storage Master Manager: storage.manager@example.com / storagemanager123');
    console.log('Storage Master: storage.master@example.com / storagemaster123');
    console.log('Item Master: item.master@example.com / itemmaster123');
    console.log('Sports Manager: sports.manager@example.com / manager123');
    console.log('Sports Specialist 1: sports.specialist1@example.com / user123');
    console.log('Sports Specialist 2: sports.specialist2@example.com / user123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
import 'dotenv/config';
import { db } from '../lib/db';
import { 
  users, items, departments, itemImages, itemRequests, 
  itemStock, borrowRequests, borrowRequestItems, itemClearances, stockMovements 
} from '../lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { parseProductCode } from '../lib/db/schema';

// Helper function to generate the next borrow request ID
async function generateBorrowRequestId(): Promise<string> {
  const prefix = 'BRW-';
  const padding = 5;

  // Find the most recent request to get the last ID
  const lastRequest = await db.query.borrowRequests.findFirst({
    orderBy: [desc(borrowRequests.requestedAt)],
    columns: {
      id: true,
    },
  });

  let nextNumber = 1; // Default to 1 if no requests exist

  if (lastRequest && lastRequest.id) {
    // Extract the numeric part, e.g., "BRW-00010" -> "00010"
    const lastNumberStr = lastRequest.id.split('-')[1];
    if (lastNumberStr) {
      // Convert to number and increment
      const lastNumber = parseInt(lastNumberStr, 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
  }

  // Pad the number with leading zeros and prepend the prefix
  const nextNumberStr = String(nextNumber).padStart(padding, '0');
  return `${prefix}${nextNumberStr}`;
}

async function seed() {
  try {
    // Delete all existing data first (in correct order to respect foreign key constraints)
    console.log('Removing all existing data...');
    await db.delete(stockMovements);
    await db.delete(borrowRequestItems);
    await db.delete(borrowRequests);
    await db.delete(itemClearances);
    await db.delete(itemRequests);
    await db.delete(itemImages);
    await db.delete(itemStock);
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

    // Create 5 sports equipment items (mix of Piero and Specs)
    console.log('Creating sports equipment items...');
    const itemsData = [
      {
        productCode: 'PIE210000001', // Piero Lifestyle
        description: 'PIERO Lifestyle Shoes - Classic Edition',
        totalStock: 35,
        period: '24Q1',
        season: 'SS',
        unitOfMeasure: 'PRS' as const,
        status: 'pending_approval' as const,
        createdBy: itemMaster1.id,
        stockData: {
          inStorage: 35,
          onBorrow: 0,
          inClearance: 0,
          seeded: 0,
          location: 'Storage 1' as const,
          condition: 'excellent' as const,
          conditionNotes: 'Brand new in box',
        }
      },
      {
        productCode: 'SPE110100001', // Specs Football
        description: 'SPECS Football Shoes - Professional Edition',
        totalStock: 2,
        period: '24Q1',
        season: 'SS',
        unitOfMeasure: 'PRS' as const,
        status: 'approved' as const,
        approvedBy: storageMaster1.id,
        approvedAt: new Date(),
        createdBy: itemMaster1.id,
        stockData: {
          inStorage: 2,
          onBorrow: 0,
          inClearance: 0,
          seeded: 0,
          location: 'Storage 1' as const,
          condition: 'good' as const,
          conditionNotes: 'Minor scuff marks on sole',
        }
      },
      {
        productCode: 'PIE210200001', // Piero Futsal
        description: 'PIERO Futsal Shoes - Indoor Edition',
        totalStock: 67,
        period: '24Q1',
        season: 'SS',
        unitOfMeasure: 'PRS' as const,
        status: 'approved' as const,
        approvedBy: storageMaster1.id,
        approvedAt: new Date(),
        createdBy: itemMaster1.id,
        stockData: {
          inStorage: 67,
          onBorrow: 0,
          inClearance: 0,
          seeded: 0,
          location: 'Storage 1' as const,
          condition: 'good' as const,
          conditionNotes: 'Display model, slight wear',
        }
      },
      {
        productCode: 'SPE110400001', // Specs Running
        description: 'SPECS Running Shoes - Marathon Edition',
        totalStock: 1,
        period: '24Q1',
        season: 'SS',
        unitOfMeasure: 'PRS' as const,
        status: 'approved' as const,
        approvedBy: storageMaster1.id,
        approvedAt: new Date(),
        createdBy: itemMaster1.id,
        stockData: {
          inStorage: 1,
          onBorrow: 0,
          inClearance: 0,
          seeded: 0,
          location: 'Storage 2' as const,
          condition: 'fair' as const,
          conditionNotes: 'Heel wear, needs replacement soon',
        }
      },
      {
        productCode: 'PIE230000001', // Piero Accessories
        description: 'PIERO Sports Watch - Professional Edition',
        totalStock: 15,
        period: '24Q1',
        season: 'SS',
        unitOfMeasure: 'PCS' as const,
        status: 'approved' as const,
        approvedBy: storageMaster1.id,
        approvedAt: new Date(),
        createdBy: itemMaster1.id,
        stockData: {
          inStorage: 15,
          onBorrow: 0,
          inClearance: 0,
          seeded: 0,
          location: 'Storage 2' as const,
          condition: 'excellent' as const,
          conditionNotes: 'With original packaging',
        }
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
        productCode: item.productCode,
        description: item.description,
        totalStock: item.totalStock,
        period: item.period,
        season: item.season,
        unitOfMeasure: item.unitOfMeasure,
        status: item.status,
        approvedBy: item.approvedBy,
        approvedAt: item.approvedAt,
        createdBy: item.createdBy,
        brandCode: parsed.brandCode,
        productDivision: parsed.productDivision,
        productCategory: parsed.productCategory,
        stockData: item.stockData
      };
    });

    // Create items and their stock records
    const createdItems = [];
    for (const itemData of processedItems) {
      // Extract stock data to create separate record
      const { stockData, ...itemFields } = itemData;
      
      // Create item
      const [createdItem] = await db.insert(items).values(itemFields).returning();
      
      // Create item stock
      await db.insert(itemStock).values({
        itemId: createdItem.id,
        ...stockData
      });
      
      createdItems.push(createdItem);
    }

    console.log('Items and stock records created successfully');

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

    // Create some sample borrow requests with multiple items
    console.log('Creating borrow requests...');
    const approvedItems = createdItems.filter(item => item.status === 'approved');
    
    // Create a borrow request with multiple items
    if (approvedItems.length >= 2) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5); // Started 5 days ago
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 5); // Ends in 5 days
      
      // Generate custom ID for the borrow request
      const borrowRequestId = await generateBorrowRequestId();
      
      // Create borrow request
      const [borrowRequest] = await db.insert(borrowRequests).values({
        id: borrowRequestId, // Use the generated custom ID
        userId: sportsUser1.id,
        startDate,
        endDate,
        reason: 'For sports event demonstration',
        status: 'approved',
        managerApprovedBy: sportsManager.id,
        managerApprovedAt: new Date(startDate.getTime() + 86400000), // Next day
        storageApprovedBy: storageMaster1.id,
        storageApprovedAt: new Date(startDate.getTime() + 172800000), // 2 days later
      }).returning();
      
      // Add items to the borrow request
      for (let i = 0; i < Math.min(2, approvedItems.length); i++) {
        const item = approvedItems[i];
        
        // Create borrow request item
        await db.insert(borrowRequestItems).values({
          borrowRequestId: borrowRequest.id, // Use the custom ID
          itemId: item.id,
          quantity: 1,
          status: 'active',
        });
        
        // Update stock to reflect borrowed item
        const [stock] = await db.select().from(itemStock).where(eq(itemStock.itemId, item.id));
        await db.update(itemStock)
          .set({
            inStorage: stock.inStorage - 1,
            onBorrow: stock.onBorrow + 1
          })
          .where(eq(itemStock.itemId, item.id));
        
        // Create stock movement record
        await db.insert(stockMovements).values({
          itemId: item.id,
          stockId: stock.id,
          movementType: 'borrow',
          quantity: 1,
          fromState: 'storage',
          toState: 'borrowed',
          referenceId: borrowRequest.id, // Use the custom ID
          referenceType: 'borrow_request',
          performedBy: storageMaster1.id,
          notes: 'Item borrowed for sports event',
        });
      }
    }
    
    // Create a pending borrow request with multiple items
    if (approvedItems.length > 2) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 2); // Starts in 2 days
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7); // Ends in 7 days
      
      // Generate custom ID for the borrow request
      const pendingBorrowRequestId = await generateBorrowRequestId();
      
      // Create borrow request
      const [pendingBorrowRequest] = await db.insert(borrowRequests).values({
        id: pendingBorrowRequestId, // Use the generated custom ID
        userId: sportsUser2.id,
        startDate,
        endDate,
        reason: 'For training session',
        status: 'pending_manager',
      }).returning();
      
      // Add items to the pending borrow request
      for (let i = 2; i < Math.min(4, approvedItems.length); i++) {
        const item = approvedItems[i];
        
        // Create borrow request item
        await db.insert(borrowRequestItems).values({
          borrowRequestId: pendingBorrowRequest.id, // Use the custom ID
          itemId: item.id,
          quantity: 1,
          status: 'pending_manager',
        });
      }
    }
    
    // Create a borrow request with a completed item
    if (approvedItems.length > 3) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10); // Started 10 days ago
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 2); // Ended 2 days ago
      
      // Generate custom ID for the borrow request
      const completedBorrowRequestId = await generateBorrowRequestId();
      
      // Create borrow request
      const [completedBorrowRequest] = await db.insert(borrowRequests).values({
        id: completedBorrowRequestId, // Use the generated custom ID
        userId: sportsUser1.id,
        startDate,
        endDate,
        reason: 'For sports competition',
        status: 'complete',
        managerApprovedBy: sportsManager.id,
        managerApprovedAt: new Date(startDate.getTime() + 86400000), // Next day
        storageApprovedBy: storageMaster1.id,
        storageApprovedAt: new Date(startDate.getTime() + 172800000), // 2 days later
        completedAt: new Date(),
        completedBy: storageMaster1.id,
      }).returning();
      
      // Add item to the completed borrow request
      const item = approvedItems[3];
      
      // Create borrow request item
      await db.insert(borrowRequestItems).values({
        borrowRequestId: completedBorrowRequest.id, // Use the custom ID
        itemId: item.id,
        quantity: 1,
        status: 'complete',
        returnCondition: 'good',
        returnNotes: 'Item used for 8 days, in good condition',
        completedAt: new Date(),
        completedBy: storageMaster1.id,
      });
      
      // Update stock to reflect returned item
      const [stock] = await db.select().from(itemStock).where(eq(itemStock.itemId, item.id));
      await db.update(itemStock)
        .set({
          inStorage: stock.inStorage + 1,
          onBorrow: stock.onBorrow - 1
        })
        .where(eq(itemStock.itemId, item.id));
      
      // Create stock movement record for completion
      await db.insert(stockMovements).values({
        itemId: item.id,
        stockId: stock.id,
        movementType: 'complete',
        quantity: 1,
        fromState: 'borrowed',
        toState: 'storage',
        referenceId: completedBorrowRequest.id, // Use the custom ID
        referenceType: 'borrow_request',
        performedBy: storageMaster1.id,
        notes: 'Item returned after competition',
      });
    }
    
    console.log('Borrow requests created successfully');

    // Create an item clearance
    console.log('Creating item clearances...');
    if (approvedItems.length > 0) {
      const item = approvedItems[0];
      
      // Get the stock record
      const [stock] = await db.select().from(itemStock).where(eq(itemStock.itemId, item.id));
      
      // Create clearance request
      const [clearanceRequest] = await db.insert(itemClearances).values({
        itemId: item.id,
        quantity: 1,
        requestedBy: storageMaster1.id,
        reason: 'Item damaged beyond repair',
        status: 'pending',
        metadata: { damageType: 'sole separation', repairCost: 0 },
      }).returning();
      
      console.log('Item clearance created successfully');
    }

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
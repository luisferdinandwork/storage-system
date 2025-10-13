import { pgTable, text, timestamp, boolean, uuid, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Departments table
export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users table with updated roles
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role', { 
    enum: ['superadmin', 'user', 'manager', 'item-master', 'storage-master', 'storage-master-manager'] 
  }).notNull().default('user'),
  departmentId: uuid('department_id').references(() => departments.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Simplified Items table - only essential fields
export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Manual input fields
  productCode: text('product_code').notNull().unique(),
  description: text('description').notNull(),
  inventory: integer('inventory').notNull().default(0),
  period: text('period').notNull(),
  season: text('season').notNull(),
  unitOfMeasure: text('unit_of_measure', { enum: ['PCS', 'PRS'] }).notNull().default('PCS'),
  
  // Auto-generated fields (from productCode)
  brandCode: text('brand_code').notNull(),
  productDivision: text('product_division').notNull(),
  productCategory: text('product_category').notNull(),
  
  // Status and condition fields
  location: text('location', { enum: ['Storage 1', 'Storage 2', 'Storage 3'] }),
  condition: text('condition', { enum: ['excellent', 'good', 'fair', 'poor'] }).notNull().default('good'),
  conditionNotes: text('condition_notes'),
  status: text('status', { 
    enum: ['pending_approval', 'approved', 'available', 'borrowed', 'in_clearance', 'rejected'] 
  }).notNull().default('pending_approval'),
  
  // Audit fields
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Item images table
export const itemImages = pgTable('item_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: uuid('item_id').references(() => items.id, { onDelete: 'cascade' }).notNull(),
  fileName: text('file_name').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  altText: text('alt_text'),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Item requests table (for item addition workflow)
export const itemRequests = pgTable('item_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: uuid('item_id').references(() => items.id, { onDelete: 'cascade' }).notNull(),
  requestedBy: uuid('requested_by').references(() => users.id).notNull(),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  notes: text('notes'),
});

// Borrow requests table
export const borrowRequests = pgTable('borrow_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: uuid('item_id').references(() => items.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  quantity: integer('quantity').notNull().default(1),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  reason: text('reason').notNull(),
  status: text('status', { 
    enum: ['pending_manager', 'pending_storage', 'approved', 'rejected', 'active', 'overdue', 'returned', 'pending_return', 'seeded'] 
  }).notNull().default('pending_manager'),
  
  // Manager approval fields
  managerApprovedBy: uuid('manager_approved_by').references(() => users.id),
  managerApprovedAt: timestamp('manager_approved_at'),
  managerRejectionReason: text('manager_rejection_reason'),
  
  // Storage master approval fields
  storageApprovedBy: uuid('storage_approved_by').references(() => users.id),
  storageApprovedAt: timestamp('storage_approved_at'),
  storageRejectionReason: text('storage_rejection_reason'),
  
  // Return fields
  dueDate: timestamp('due_date'),
  returnedAt: timestamp('returned_at'),
  returnCondition: text('return_condition', { enum: ['excellent', 'good', 'fair', 'poor'] }),
  returnNotes: text('return_notes'),
  receivedBy: uuid('received_by').references(() => users.id),
  receivedAt: timestamp('received_at'),
  receiveNotes: text('receive_notes'),
});

// Return requests table
export const returnRequests = pgTable('return_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  borrowRequestId: uuid('borrow_request_id').references(() => borrowRequests.id, { onDelete: 'cascade' }).notNull(),
  itemId: uuid('item_id').references(() => items.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  reason: text('reason').notNull(),
  returnCondition: text('return_condition', { enum: ['excellent', 'good', 'fair', 'poor'] }).notNull(),
  returnNotes: text('return_notes'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  receivedBy: uuid('received_by').references(() => users.id),
  receivedAt: timestamp('received_at'),
  receiveNotes: text('receive_notes'),
});

// Item clearances table
export const itemClearances = pgTable('item_clearances', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: uuid('item_id').references(() => items.id, { onDelete: 'cascade' }).notNull(),
  requestedBy: uuid('requested_by').references(() => users.id).notNull(),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  reason: text('reason').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  clearedAt: timestamp('cleared_at'),
  metadata: jsonb('metadata').notNull(),
});

// Relations
export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  itemsCreated: many(items),
  itemsApproved: many(items),
  itemRequests: many(itemRequests),
  borrowRequests: many(borrowRequests),
  returnRequests: many(returnRequests),
  itemClearances: many(itemClearances),
  managerApprovals: many(borrowRequests, { relationName: 'managerApproval' }),
  storageApprovals: many(borrowRequests, { relationName: 'storageApproval' }),
  returnApprovals: many(returnRequests, { relationName: 'returnApproval' }),
  clearanceApprovals: many(itemClearances, { relationName: 'clearanceApproval' }),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [items.createdBy],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [items.approvedBy],
    references: [users.id],
  }),
  images: many(itemImages),
  itemRequests: many(itemRequests),
  borrowRequests: many(borrowRequests),
  returnRequests: many(returnRequests),
  clearance: one(itemClearances, {
    fields: [items.id],
    references: [itemClearances.itemId],
  }),
}));

export const itemImagesRelations = relations(itemImages, ({ one }) => ({
  item: one(items, {
    fields: [itemImages.itemId],
    references: [items.id],
  }),
}));

export const itemRequestsRelations = relations(itemRequests, ({ one }) => ({
  item: one(items, {
    fields: [itemRequests.itemId],
    references: [items.id],
  }),
  requestedBy: one(users, {
    fields: [itemRequests.requestedBy],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [itemRequests.approvedBy],
    references: [users.id],
  }),
}));

export const borrowRequestsRelations = relations(borrowRequests, ({ one }) => ({
  item: one(items, {
    fields: [borrowRequests.itemId],
    references: [items.id],
  }),
  user: one(users, {
    fields: [borrowRequests.userId],
    references: [users.id],
  }),
  managerApprovedBy: one(users, {
    fields: [borrowRequests.managerApprovedBy],
    references: [users.id],
    relationName: 'managerApproval',
  }),
  storageApprovedBy: one(users, {
    fields: [borrowRequests.storageApprovedBy],
    references: [users.id],
    relationName: 'storageApproval',
  }),
  receivedBy: one(users, {
    fields: [borrowRequests.receivedBy],
    references: [users.id],
  }),
}));

export const returnRequestsRelations = relations(returnRequests, ({ one }) => ({
  borrowRequest: one(borrowRequests, {
    fields: [returnRequests.borrowRequestId],
    references: [borrowRequests.id],
  }),
  item: one(items, {
    fields: [returnRequests.itemId],
    references: [items.id],
  }),
  user: one(users, {
    fields: [returnRequests.userId],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [returnRequests.approvedBy],
    references: [users.id],
    relationName: 'returnApproval',
  }),
  receivedBy: one(users, {
    fields: [returnRequests.receivedBy],
    references: [users.id],
  }),
}));

export const itemClearancesRelations = relations(itemClearances, ({ one }) => ({
  item: one(items, {
    fields: [itemClearances.itemId],
    references: [items.id],
  }),
  requestedBy: one(users, {
    fields: [itemClearances.requestedBy],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [itemClearances.approvedBy],
    references: [users.id],
    relationName: 'clearanceApproval',
  }),
}));

// Type exports
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

export type ItemImage = typeof itemImages.$inferSelect;
export type NewItemImage = typeof itemImages.$inferInsert;

export type ItemRequest = typeof itemRequests.$inferSelect;
export type NewItemRequest = typeof itemRequests.$inferInsert;

export type BorrowRequest = typeof borrowRequests.$inferSelect;
export type NewBorrowRequest = typeof borrowRequests.$inferInsert;

export type ReturnRequest = typeof returnRequests.$inferSelect;
export type NewReturnRequest = typeof returnRequests.$inferInsert;

export type ItemClearance = typeof itemClearances.$inferSelect;
export type NewItemClearance = typeof itemClearances.$inferInsert;

export type UserRole = User['role'];
export type ItemStatus = Item['status'];
export type ItemCondition = Item['condition'];
export type ItemLocation = Item['location'];
export type UnitOfMeasure = Item['unitOfMeasure'];
export type BorrowRequestStatus = BorrowRequest['status'];
export type ReturnRequestStatus = ReturnRequest['status'];
export type ItemRequestStatus = ItemRequest['status'];
export type ItemClearanceStatus = ItemClearance['status'];

// ============================================================================
// PRODUCT CODE PARSER - Automatically generates BrandCode, Division, Category
// ============================================================================

interface ProductCodeMapping {
  brandCode: string;
  brandName: string;
  productDivision: string;
  divisionName: string;
  productCategory: string;
  categoryName: string;
  rangeStart: string;
  rangeEnd: string;
}

// Product code mapping configuration
const PRODUCT_CODE_MAPPINGS: ProductCodeMapping[] = [
  // PIERO Brand
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '21', divisionName: 'Footwear', productCategory: '00', categoryName: 'Lifestyle', rangeStart: 'PIE210000001', rangeEnd: 'PIE210099999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '21', divisionName: 'Footwear', productCategory: '01', categoryName: 'Football', rangeStart: 'PIE210100001', rangeEnd: 'PIE210199999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '21', divisionName: 'Footwear', productCategory: '02', categoryName: 'Futsal', rangeStart: 'PIE210200001', rangeEnd: 'PIE210299999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '21', divisionName: 'Footwear', productCategory: '03', categoryName: 'Street Soccer', rangeStart: 'PIE210300001', rangeEnd: 'PIE210399999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '21', divisionName: 'Footwear', productCategory: '04', categoryName: 'Running', rangeStart: 'PIE210400001', rangeEnd: 'PIE210499999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '21', divisionName: 'Footwear', productCategory: '05', categoryName: 'Training', rangeStart: 'PIE210500001', rangeEnd: 'PIE210599999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '21', divisionName: 'Footwear', productCategory: '06', categoryName: 'Volley', rangeStart: 'PIE210600001', rangeEnd: 'PIE210699999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '21', divisionName: 'Footwear', productCategory: '08', categoryName: 'Badminton', rangeStart: 'PIE210800001', rangeEnd: 'PIE210899999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '21', divisionName: 'Footwear', productCategory: '09', categoryName: 'Tennis', rangeStart: 'PIE210900001', rangeEnd: 'PIE210999999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '21', divisionName: 'Footwear', productCategory: '10', categoryName: 'Basketball', rangeStart: 'PIE211000001', rangeEnd: 'PIE211099999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '21', divisionName: 'Footwear', productCategory: '12', categoryName: 'Skateboard', rangeStart: 'PIE211200001', rangeEnd: 'PIE211299999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '21', divisionName: 'Footwear', productCategory: '14', categoryName: 'Swimming', rangeStart: 'PIE211400001', rangeEnd: 'PIE211499999' },
  
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '22', divisionName: 'Apparel', productCategory: '00', categoryName: 'Lifestyle', rangeStart: 'PIE220000001', rangeEnd: 'PIE220099999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '22', divisionName: 'Apparel', productCategory: '01', categoryName: 'Football', rangeStart: 'PIE220100001', rangeEnd: 'PIE220199999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '22', divisionName: 'Apparel', productCategory: '02', categoryName: 'Futsal', rangeStart: 'PIE220200001', rangeEnd: 'PIE220299999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '22', divisionName: 'Apparel', productCategory: '04', categoryName: 'Running', rangeStart: 'PIE220400001', rangeEnd: 'PIE220499999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '22', divisionName: 'Apparel', productCategory: '05', categoryName: 'Training', rangeStart: 'PIE220500001', rangeEnd: 'PIE220599999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '22', divisionName: 'Apparel', productCategory: '06', categoryName: 'Volley', rangeStart: 'PIE220600001', rangeEnd: 'PIE220699999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '22', divisionName: 'Apparel', productCategory: '09', categoryName: 'Tennis', rangeStart: 'PIE220900001', rangeEnd: 'PIE220999999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '22', divisionName: 'Apparel', productCategory: '10', categoryName: 'Basketball', rangeStart: 'PIE221000001', rangeEnd: 'PIE221099999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '22', divisionName: 'Apparel', productCategory: '14', categoryName: 'Swimming', rangeStart: 'PIE221400001', rangeEnd: 'PIE221499999' },
  
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '23', divisionName: 'Accessories', productCategory: '00', categoryName: 'Lifestyle', rangeStart: 'PIE230000001', rangeEnd: 'PIE230099999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '23', divisionName: 'Accessories', productCategory: '01', categoryName: 'Football', rangeStart: 'PIE230100001', rangeEnd: 'PIE230199999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '23', divisionName: 'Accessories', productCategory: '02', categoryName: 'Futsal', rangeStart: 'PIE230200001', rangeEnd: 'PIE230299999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '23', divisionName: 'Accessories', productCategory: '04', categoryName: 'Running', rangeStart: 'PIE230400001', rangeEnd: 'PIE230499999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '23', divisionName: 'Accessories', productCategory: '05', categoryName: 'Training', rangeStart: 'PIE230500001', rangeEnd: 'PIE230599999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '23', divisionName: 'Accessories', productCategory: '06', categoryName: 'Volley', rangeStart: 'PIE230600001', rangeEnd: 'PIE230699999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '23', divisionName: 'Accessories', productCategory: '08', categoryName: 'Badminton', rangeStart: 'PIE230800001', rangeEnd: 'PIE230899999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '23', divisionName: 'Accessories', productCategory: '10', categoryName: 'Basketball', rangeStart: 'PIE231000001', rangeEnd: 'PIE231099999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '23', divisionName: 'Accessories', productCategory: '17', categoryName: 'Back to school', rangeStart: 'PIE231700001', rangeEnd: 'PIE231799999' },
  
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '24', divisionName: 'Equipment', productCategory: '00', categoryName: 'Lifestyle', rangeStart: 'PIE240000001', rangeEnd: 'PIE240099999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '24', divisionName: 'Equipment', productCategory: '01', categoryName: 'Football', rangeStart: 'PIE240100001', rangeEnd: 'PIE240199999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '24', divisionName: 'Equipment', productCategory: '02', categoryName: 'Futsal', rangeStart: 'PIE240200001', rangeEnd: 'PIE240299999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '24', divisionName: 'Equipment', productCategory: '04', categoryName: 'Running', rangeStart: 'PIE240400001', rangeEnd: 'PIE240499999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '24', divisionName: 'Equipment', productCategory: '05', categoryName: 'Training', rangeStart: 'PIE240500001', rangeEnd: 'PIE240599999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '24', divisionName: 'Equipment', productCategory: '08', categoryName: 'Badminton', rangeStart: 'PIE240800001', rangeEnd: 'PIE240899999' },
  { brandCode: 'PIE', brandName: 'Piero', productDivision: '24', divisionName: 'Equipment', productCategory: '10', categoryName: 'Basketball', rangeStart: 'PIE241000001', rangeEnd: 'PIE241099999' },
  
  // SPECS Brand
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '11', divisionName: 'Footwear', productCategory: '00', categoryName: 'Lifestyle', rangeStart: 'SPE110000001', rangeEnd: 'SPE110099999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '11', divisionName: 'Footwear', productCategory: '01', categoryName: 'Football', rangeStart: 'SPE110100001', rangeEnd: 'SPE110199999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '11', divisionName: 'Footwear', productCategory: '02', categoryName: 'Futsal', rangeStart: 'SPE110200001', rangeEnd: 'SPE110299999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '11', divisionName: 'Footwear', productCategory: '03', categoryName: 'Street Soccer', rangeStart: 'SPE110300001', rangeEnd: 'SPE110399999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '11', divisionName: 'Footwear', productCategory: '04', categoryName: 'Running', rangeStart: 'SPE110400001', rangeEnd: 'SPE110499999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '11', divisionName: 'Footwear', productCategory: '05', categoryName: 'Training', rangeStart: 'SPE110500001', rangeEnd: 'SPE110599999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '11', divisionName: 'Footwear', productCategory: '06', categoryName: 'Volley', rangeStart: 'SPE110600001', rangeEnd: 'SPE110699999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '11', divisionName: 'Footwear', productCategory: '08', categoryName: 'Badminton', rangeStart: 'SPE110800001', rangeEnd: 'SPE110899999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '11', divisionName: 'Footwear', productCategory: '09', categoryName: 'Tennis', rangeStart: 'SPE110900001', rangeEnd: 'SPE110999999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '11', divisionName: 'Footwear', productCategory: '10', categoryName: 'Basketball', rangeStart: 'SPE111000001', rangeEnd: 'SPE111099999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '11', divisionName: 'Footwear', productCategory: '12', categoryName: 'Skateboard', rangeStart: 'SPE111200001', rangeEnd: 'SPE111299999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '11', divisionName: 'Footwear', productCategory: '14', categoryName: 'Swimming', rangeStart: 'SPE111400001', rangeEnd: 'SPE111499999' },
  
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '12', divisionName: 'Apparel', productCategory: '00', categoryName: 'Lifestyle', rangeStart: 'SPE120000001', rangeEnd: 'SPE120099999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '12', divisionName: 'Apparel', productCategory: '01', categoryName: 'Football', rangeStart: 'SPE120100001', rangeEnd: 'SPE120199999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '12', divisionName: 'Apparel', productCategory: '02', categoryName: 'Futsal', rangeStart: 'SPE120200001', rangeEnd: 'SPE120299999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '12', divisionName: 'Apparel', productCategory: '04', categoryName: 'Running', rangeStart: 'SPE120400001', rangeEnd: 'SPE120499999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '12', divisionName: 'Apparel', productCategory: '05', categoryName: 'Training', rangeStart: 'SPE120500001', rangeEnd: 'SPE120599999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '12', divisionName: 'Apparel', productCategory: '06', categoryName: 'Volley', rangeStart: 'SPE120600001', rangeEnd: 'SPE120699999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '12', divisionName: 'Apparel', productCategory: '09', categoryName: 'Tennis', rangeStart: 'SPE120900001', rangeEnd: 'SPE120999999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '12', divisionName: 'Apparel', productCategory: '10', categoryName: 'Basketball', rangeStart: 'SPE121000001', rangeEnd: 'SPE121099999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '12', divisionName: 'Apparel', productCategory: '14', categoryName: 'Swimming', rangeStart: 'SPE121400001', rangeEnd: 'SPE121499999' },
  
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '13', divisionName: 'Accessories', productCategory: '00', categoryName: 'Lifestyle', rangeStart: 'SPE130000001', rangeEnd: 'SPE130099999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '13', divisionName: 'Accessories', productCategory: '01', categoryName: 'Football', rangeStart: 'SPE130100001', rangeEnd: 'SPE130199999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '13', divisionName: 'Accessories', productCategory: '02', categoryName: 'Futsal', rangeStart: 'SPE130200001', rangeEnd: 'SPE130299999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '13', divisionName: 'Accessories', productCategory: '04', categoryName: 'Running', rangeStart: 'SPE130400001', rangeEnd: 'SPE130499999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '13', divisionName: 'Accessories', productCategory: '05', categoryName: 'Training', rangeStart: 'SPE130500001', rangeEnd: 'SPE130599999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '13', divisionName: 'Accessories', productCategory: '06', categoryName: 'Volley', rangeStart: 'SPE130600001', rangeEnd: 'SPE130699999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '13', divisionName: 'Accessories', productCategory: '08', categoryName: 'Badminton', rangeStart: 'SPE130800001', rangeEnd: 'SPE130899999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '13', divisionName: 'Accessories', productCategory: '10', categoryName: 'Basketball', rangeStart: 'SPE131000001', rangeEnd: 'SPE131099999' },
  
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '14', divisionName: 'Equipment', productCategory: '00', categoryName: 'Lifestyle', rangeStart: 'SPE140000001', rangeEnd: 'SPE140099999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '14', divisionName: 'Equipment', productCategory: '01', categoryName: 'Football', rangeStart: 'SPE140100001', rangeEnd: 'SPE140199999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '14', divisionName: 'Equipment', productCategory: '02', categoryName: 'Futsal', rangeStart: 'SPE140200001', rangeEnd: 'SPE140299999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '14', divisionName: 'Equipment', productCategory: '04', categoryName: 'Running', rangeStart: 'SPE140400001', rangeEnd: 'SPE140499999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '14', divisionName: 'Equipment', productCategory: '05', categoryName: 'Training', rangeStart: 'SPE140500001', rangeEnd: 'SPE140599999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '14', divisionName: 'Equipment', productCategory: '08', categoryName: 'Badminton', rangeStart: 'SPE140800001', rangeEnd: 'SPE140899999' },
  { brandCode: 'SPE', brandName: 'Specs', productDivision: '14', divisionName: 'Equipment', productCategory: '10', categoryName: 'Basketball', rangeStart: 'SPE141000001', rangeEnd: 'SPE141099999' },
];

interface ParsedProductCode {
  brandCode: string;
  brandName: string;
  productDivision: string;
  divisionName: string;
  productCategory: string;
  categoryName: string;
  sequenceNumber: string;
  isValid: boolean;
  error?: string;
}

/**
 * Parse a product code and return its components
 * Product Code Format: XXX-YY-ZZ-NNNNN
 * Example: SPE120200001
 * - XXX (SPE) = Brand Code (3 characters)
 * - YY (12) = Product Division (2 digits)
 * - ZZ (02) = Product Category (2 digits)
 * - NNNNN (00001) = Sequence Number (5 digits)
 */
export function parseProductCode(productCode: string): ParsedProductCode {
  // Remove any spaces and convert to uppercase
  const cleanCode = productCode.trim().toUpperCase();
  
  // Validate format: must be at least 12 characters (3+2+2+5)
  if (cleanCode.length !== 12) {
    return {
      brandCode: '',
      brandName: '',
      productDivision: '',
      divisionName: '',
      productCategory: '',
      categoryName: '',
      sequenceNumber: '',
      isValid: false,
      error: 'Product code must be exactly 12 characters'
    };
  }
  
  // Extract parts
  const brandCode = cleanCode.substring(0, 3);
  const division = cleanCode.substring(3, 5);
  const category = cleanCode.substring(5, 7);
  const sequence = cleanCode.substring(7, 12);
  
  // Validate sequence is numeric
  if (!/^\d{5}$/.test(sequence)) {
    return {
      brandCode,
      brandName: '',
      productDivision: division,
      divisionName: '',
      productCategory: category,
      categoryName: '',
      sequenceNumber: sequence,
      isValid: false,
      error: 'Sequence number must be 5 digits'
    };
  }
  
  // Find matching mapping
  const mapping = PRODUCT_CODE_MAPPINGS.find(
    m => m.brandCode === brandCode && 
         m.productDivision === division && 
         m.productCategory === category
  );
  
  if (!mapping) {
    return {
      brandCode,
      brandName: '',
      productDivision: division,
      divisionName: '',
      productCategory: category,
      categoryName: '',
      sequenceNumber: sequence,
      isValid: false,
      error: `No mapping found for ${brandCode}-${division}-${category}`
    };
  }
  
  // Validate sequence is within range
  const seqNum = parseInt(sequence, 10);
  const rangeStart = parseInt(mapping.rangeStart.substring(7, 12), 10);
  const rangeEnd = parseInt(mapping.rangeEnd.substring(7, 12), 10);
  
  if (seqNum < rangeStart || seqNum > rangeEnd) {
    return {
      brandCode,
      brandName: mapping.brandName,
      productDivision: division,
      divisionName: mapping.divisionName,
      productCategory: category,
      categoryName: mapping.categoryName,
      sequenceNumber: sequence,
      isValid: false,
      error: `Sequence ${sequence} is outside valid range ${mapping.rangeStart.substring(7, 12)}-${mapping.rangeEnd.substring(7, 12)}`
    };
  }
  
  return {
    brandCode,
    brandName: mapping.brandName,
    productDivision: division,
    divisionName: mapping.divisionName,
    productCategory: category,
    categoryName: mapping.categoryName,
    sequenceNumber: sequence,
    isValid: true
  };
}

/**
 * Validate if a product code is valid
 */
export function validateProductCode(productCode: string): { isValid: boolean; error?: string } {
  const parsed = parseProductCode(productCode);
  return {
    isValid: parsed.isValid,
    error: parsed.error
  };
}

/**
 * Get the next available product code in a category
 * Useful for generating new product codes
 */
export function getNextProductCode(
  brandCode: string, 
  division: string, 
  category: string, 
  lastSequence: number
): string | null {
  const mapping = PRODUCT_CODE_MAPPINGS.find(
    m => m.brandCode === brandCode && 
         m.productDivision === division && 
         m.productCategory === category
  );
  
  if (!mapping) {
    return null;
  }
  
  const rangeEnd = parseInt(mapping.rangeEnd.substring(7, 12), 10);
  const nextSeq = lastSequence + 1;
  
  if (nextSeq > rangeEnd) {
    return null; // Range exhausted
  }
  
  const paddedSeq = nextSeq.toString().padStart(5, '0');
  return `${brandCode}${division}${category}${paddedSeq}`;
}

/**
 * Get all available categories for a brand and division
 */
export function getAvailableCategories(brandCode: string, division: string): ProductCodeMapping[] {
  return PRODUCT_CODE_MAPPINGS.filter(
    m => m.brandCode === brandCode && m.productDivision === division
  );
}

/**
 * Get all divisions for a brand
 */
export function getAvailableDivisions(brandCode: string): ProductCodeMapping[] {
  const divisions = new Map<string, ProductCodeMapping>();
  
  PRODUCT_CODE_MAPPINGS.forEach(m => {
    if (m.brandCode === brandCode && !divisions.has(m.productDivision)) {
      divisions.set(m.productDivision, m);
    }
  });
  
  return Array.from(divisions.values());
}

/**
 * Example usage when creating a new item:
 * 
 * const productCode = "SPE120200001";
 * const parsed = parseProductCode(productCode);
 * 
 * if (parsed.isValid) {
 *   const newItem = {
 *     productCode: productCode,
 *     brandCode: parsed.brandCode,          // "SPE"
 *     productDivision: parsed.divisionName, // "Apparel"
 *     productCategory: parsed.categoryName, // "Futsal"
 *     description: "...",
 *     inventory: 10,
 *     period: "2025",
 *     season: "Spring",
 *     unitOfMeasure: "PCS",
 *     createdBy: userId
 *   };
 * }
 */
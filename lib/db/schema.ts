import { pgTable, text, timestamp, boolean, uuid, integer, jsonb, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { varchar } from 'drizzle-orm/pg-core';

// Departments table (unchanged)
export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users table (unchanged)
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

// Locations table - NEW
export const locations = pgTable('locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Boxes table - FIXED
export const boxes = pgTable('boxes', {
  id: uuid('id').defaultRandom().primaryKey(),
  locationId: uuid('location_id').references(() => locations.id, { onDelete: 'cascade' }).notNull(),
  boxNumber: text('box_number').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  unique('unique_box_number').on(table.locationId, table.boxNumber)
]);

// Items table - UPDATED to use productCode as ID
export const items = pgTable('items', {
  // Using productCode as primary key instead of generated UUID
  productCode: text('product_code').primaryKey(),
  
  // Product identification
  description: text('description').notNull(),
  
  // Product metadata (auto-generated from productCode)
  brandCode: text('brand_code').notNull(),
  productDivision: text('product_division').notNull(),
  productCategory: text('product_category').notNull(),
  
  // Product details
  period: text('period').notNull(),
  season: text('season').notNull(),
  unitOfMeasure: text('unit_of_measure', { enum: ['PCS', 'PRS'] }).notNull().default('PCS'),
  
  // Approval status for the item itself
  status: text('status', { 
    enum: ['pending_approval', 'approved', 'rejected'] 
  }).notNull().default('pending_approval'),
  
  // Audit fields
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Stock table - UPDATED to reference boxes instead of location enum
export const itemStock = pgTable('item_stock', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: text('item_id').references(() => items.productCode, { onDelete: 'cascade' }).notNull(),
  
  // Quantity tracking by state
  pending: integer('pending').notNull().default(0),
  inStorage: integer('in_storage').notNull().default(0),
  onBorrow: integer('on_borrow').notNull().default(0),
  inClearance: integer('in_clearance').notNull().default(0),
  seeded: integer('seeded').notNull().default(0),
  
  // Storage location (now references box instead of enum)
  boxId: uuid('box_id').references(() => boxes.id, { onDelete: 'set null' }),
  
  // Item condition
  condition: text('condition', { enum: ['excellent', 'good', 'fair', 'poor'] }).notNull().default('good'),
  conditionNotes: text('condition_notes'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Item images table - UPDATED to reference productCode
export const itemImages = pgTable('item_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: text('item_id').references(() => items.productCode, { onDelete: 'cascade' }).notNull(),
  fileName: text('file_name').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  altText: text('alt_text'),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Item requests table - UPDATED to reference productCode
export const itemRequests = pgTable('item_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: text('item_id').references(() => items.productCode, { onDelete: 'cascade' }).notNull(),
  requestedBy: uuid('requested_by').references(() => users.id).notNull(),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  notes: text('notes'),
});

// Borrow requests table (unchanged)
export const borrowRequests = pgTable('borrow_requests', {
  id: varchar('id', { length: 10 }).primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  reason: text('reason').notNull(),
  status: text('status', { 
    enum: [ 'pending_manager', 'pending_storage', 'approved', 'rejected', 'active', 'complete', 'seeded', 'reverted'] 
  }).notNull().default('pending_manager'),
  
  // Manager approval fields
  managerApprovedBy: uuid('manager_approved_by').references(() => users.id),
  managerApprovedAt: timestamp('manager_approved_at'),
  managerRejectionReason: text('manager_rejection_reason'),
  
  // Storage master approval fields
  storageApprovedBy: uuid('storage_approved_by').references(() => users.id),
  storageApprovedAt: timestamp('storage_approved_at'),
  storageRejectionReason: text('storage_rejection_reason'),
  
  // Completion/Seeding fields
  completedAt: timestamp('completed_at'),
  completedBy: uuid('completed_by').references(() => users.id),
  seededAt: timestamp('seeded_at'),
  seededBy: uuid('seeded_by').references(() => users.id),
  revertedAt: timestamp('reverted_at'),
  revertedBy: uuid('reverted_by').references(() => users.id),
  notes: text('notes'),
});

// Borrow request items table - UPDATED to reference productCode
export const borrowRequestItems = pgTable('borrow_request_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  borrowRequestId: varchar('borrow_request_id', { length: 10 }).references(() => borrowRequests.id, { onDelete: 'cascade' }).notNull(),
  itemId: text('item_id').references(() => items.productCode, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  status: text('status', { 
    enum: ['pending_manager', 'pending_storage', 'rejected', 'active', 'complete', 'seeded', 'reverted'] 
  }).notNull().default('pending_manager'),
  
  // Return/Completion fields
  returnCondition: text('return_condition', { enum: ['excellent', 'good', 'fair', 'poor'] }),
  returnNotes: text('return_notes'),
  completedAt: timestamp('completed_at'),
  completedBy: uuid('completed_by').references(() => users.id),
  seededAt: timestamp('seeded_at'),
  seededBy: uuid('seeded_by').references(() => users.id),
  revertedAt: timestamp('reverted_at'),
  revertedBy: uuid('reverted_by').references(() => users.id),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Item clearances table - UPDATED to reference productCode
export const itemClearances = pgTable('item_clearances', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: text('item_id').references(() => items.productCode, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  requestedBy: uuid('requested_by').references(() => users.id).notNull(),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  reason: text('reason').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'completed'] }).notNull().default('pending'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  clearedAt: timestamp('cleared_at'),
  metadata: jsonb('metadata').notNull(),
});

// Stock movements table - UPDATED to reference productCode and add boxId
export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: text('item_id').references(() => items.productCode, { onDelete: 'cascade' }).notNull(),
  stockId: uuid('stock_id').references(() => itemStock.id, { onDelete: 'cascade' }).notNull(),
  
  // Movement details
  movementType: text('movement_type', { 
    enum: ['initial_stock', 'borrow', 'complete', 'clearance', 'seed', 'revert_seed', 'adjustment'] 
  }).notNull(),
  quantity: integer('quantity').notNull(),
  
  // State changes
  fromState: text('from_state', { enum: ['storage', 'borrowed', 'clearance', 'seeded', 'none', 'pending'] }),
  toState: text('to_state', { enum: ['storage', 'borrowed', 'clearance', 'seeded', 'none', 'pending'] }),
  
  // Reference to related entity
  referenceId: varchar('reference_id', { length: 10 }),
  referenceType: text('reference_type', { enum: ['borrow_request', 'borrow_request_item', 'clearance', 'manual'] }),
  
  // Storage location tracking
  boxId: uuid('box_id').references(() => boxes.id, { onDelete: 'set null' }),
  
  // Audit
  performedBy: uuid('performed_by').references(() => users.id).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Clearance Forms table
export const clearanceForms = pgTable('clearance_forms', {
  id: uuid('id').defaultRandom().primaryKey(),
  formNumber: varchar('form_number', { length: 20 }).notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  period: text('period').notNull(), // e.g., "2023-Q4", "2024-H1"
  status: text('status', { 
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'processed'] 
  }).notNull().default('draft'),
  
  // Audit fields
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  
  // Approval fields
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  
  // Processing fields
  processedAt: timestamp('processed_at'),
  processedBy: uuid('processed_by').references(() => users.id),
});

// Clearance Form Items table (junction table)
export const clearanceFormItems = pgTable('clearance_form_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  formId: uuid('form_id').references(() => clearanceForms.id, { onDelete: 'cascade' }).notNull(),
  itemId: text('item_id').references(() => items.productCode, { onDelete: 'cascade' }).notNull(),
  stockId: uuid('stock_id').references(() => itemStock.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull(),
  condition: text('condition', { enum: ['excellent', 'good', 'fair', 'poor'] }).notNull().default('good'),
  conditionNotes: text('condition_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Cleared Items table (stores historical data of cleared items)
export const clearedItems = pgTable('cleared_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  formId: uuid('form_id').references(() => clearanceForms.id, { onDelete: 'set null' }),
  formNumber: varchar('form_number', { length: 20 }).notNull(),
  
  // Item details (copied from items table)
  productCode: text('product_code').notNull(),
  description: text('description').notNull(),
  brandCode: text('brand_code').notNull(),
  productDivision: text('product_division').notNull(),
  productCategory: text('product_category').notNull(),
  period: text('period').notNull(),
  season: text('season').notNull(),
  unitOfMeasure: text('unit_of_measure', { enum: ['PCS', 'PRS'] }).notNull(),
  
  // Clearance details
  quantity: integer('quantity').notNull(),
  condition: text('condition', { enum: ['excellent', 'good', 'fair', 'poor'] }).notNull(),
  conditionNotes: text('condition_notes'),
  
  // Location details (copied from stock)
  boxId: uuid('box_id'),
  boxNumber: text('box_number'),
  locationId: uuid('location_id'),
  locationName: text('location_name'),
  
  // Audit fields
  clearedAt: timestamp('cleared_at').defaultNow().notNull(),
  clearedBy: uuid('cleared_by').references(() => users.id).notNull(),
});

// Add relations for the new tables
export const clearanceFormsRelations = relations(clearanceForms, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [clearanceForms.createdBy],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [clearanceForms.approvedBy],
    references: [users.id],
  }),
  processedBy: one(users, {
    fields: [clearanceForms.processedBy],
    references: [users.id],
  }),
  items: many(clearanceFormItems),
  clearedItems: many(clearedItems),
}));

export const clearanceFormItemsRelations = relations(clearanceFormItems, ({ one }) => ({
  form: one(clearanceForms, {
    fields: [clearanceFormItems.formId],
    references: [clearanceForms.id],
  }),
  item: one(items, {
    fields: [clearanceFormItems.itemId],
    references: [items.productCode],
  }),
  stock: one(itemStock, {
    fields: [clearanceFormItems.stockId],
    references: [itemStock.id],
  }),
}));

export const clearedItemsRelations = relations(clearedItems, ({ one }) => ({
  form: one(clearanceForms, {
    fields: [clearedItems.formId],
    references: [clearanceForms.id],
  }),
  clearedBy: one(users, {
    fields: [clearedItems.clearedBy],
    references: [users.id],
  }),
}));

// Relations - UPDATED for new tables and references
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
  itemClearances: many(itemClearances),
  stockMovements: many(stockMovements),
  managerApprovals: many(borrowRequests, { relationName: 'managerApproval' }),
  storageApprovals: many(borrowRequests, { relationName: 'storageApproval' }),
  clearanceApprovals: many(itemClearances, { relationName: 'clearanceApproval' }),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  boxes: many(boxes),
}));

export const boxesRelations = relations(boxes, ({ one, many }) => ({
  location: one(locations, {
    fields: [boxes.locationId],
    references: [locations.id],
  }),
  stockItems: many(itemStock),
  stockMovements: many(stockMovements),
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
  stock: one(itemStock, {
    fields: [items.productCode],
    references: [itemStock.itemId],
  }),
  images: many(itemImages),
  itemRequests: many(itemRequests),
  borrowRequestItems: many(borrowRequestItems),
  clearances: many(itemClearances),
  stockMovements: many(stockMovements),
}));

export const itemStockRelations = relations(itemStock, ({ one, many }) => ({
  item: one(items, {
    fields: [itemStock.itemId],
    references: [items.productCode],
  }),
  box: one(boxes, {
    fields: [itemStock.boxId],
    references: [boxes.id],
  }),
  movements: many(stockMovements),
}));

export const itemImagesRelations = relations(itemImages, ({ one }) => ({
  item: one(items, {
    fields: [itemImages.itemId],
    references: [items.productCode],
  }),
}));

export const itemRequestsRelations = relations(itemRequests, ({ one }) => ({
  item: one(items, {
    fields: [itemRequests.itemId],
    references: [items.productCode],
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

export const borrowRequestsRelations = relations(borrowRequests, ({ one, many }) => ({
  user: one(users, {
    fields: [borrowRequests.userId],
    references: [users.id],
  }),
  items: many(borrowRequestItems),
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
  completedBy: one(users, {
    fields: [borrowRequests.completedBy],
    references: [users.id],
  }),
  seededBy: one(users, {
    fields: [borrowRequests.seededBy],
    references: [users.id],
  }),
  revertedBy: one(users, {
    fields: [borrowRequests.revertedBy],
    references: [users.id],
  }),
}));

export const borrowRequestItemsRelations = relations(borrowRequestItems, ({ one }) => ({
  borrowRequest: one(borrowRequests, {
    fields: [borrowRequestItems.borrowRequestId],
    references: [borrowRequests.id],
  }),
  item: one(items, {
    fields: [borrowRequestItems.itemId],
    references: [items.productCode],
  }),
  completedBy: one(users, {
    fields: [borrowRequestItems.completedBy],
    references: [users.id],
  }),
  seededBy: one(users, {
    fields: [borrowRequestItems.seededBy],
    references: [users.id],
  }),
  revertedBy: one(users, {
    fields: [borrowRequestItems.revertedBy],
    references: [users.id],
  }),
}));

export const itemClearancesRelations = relations(itemClearances, ({ one }) => ({
  item: one(items, {
    fields: [itemClearances.itemId],
    references: [items.productCode],
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

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  item: one(items, {
    fields: [stockMovements.itemId],
    references: [items.productCode],
  }),
  stock: one(itemStock, {
    fields: [stockMovements.stockId],
    references: [itemStock.id],
  }),
  box: one(boxes, {
    fields: [stockMovements.boxId],
    references: [boxes.id],
  }),
  performedBy: one(users, {
    fields: [stockMovements.performedBy],
    references: [users.id],
  }),
}));

// Type exports - UPDATED with new types
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

export type Box = typeof boxes.$inferSelect;
export type NewBox = typeof boxes.$inferInsert;

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

export type ItemStock = typeof itemStock.$inferSelect;
export type NewItemStock = typeof itemStock.$inferInsert;

export type ItemImage = typeof itemImages.$inferSelect;
export type NewItemImage = typeof itemImages.$inferInsert;

export type ItemRequest = typeof itemRequests.$inferSelect;
export type NewItemRequest = typeof itemRequests.$inferInsert;

export type BorrowRequest = typeof borrowRequests.$inferSelect;
export type NewBorrowRequest = typeof borrowRequests.$inferInsert;

export type BorrowRequestItem = typeof borrowRequestItems.$inferSelect;
export type NewBorrowRequestItem = typeof borrowRequestItems.$inferInsert;

export type ItemClearance = typeof itemClearances.$inferSelect;
export type NewItemClearance = typeof itemClearances.$inferInsert;

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;

export type ClearanceForm = typeof clearanceForms.$inferSelect;
export type NewClearanceForm = typeof clearanceForms.$inferInsert;

export type ClearanceFormItem = typeof clearanceFormItems.$inferSelect;
export type NewClearanceFormItem = typeof clearanceFormItems.$inferInsert;

export type ClearedItem = typeof clearedItems.$inferSelect;
export type NewClearedItem = typeof clearedItems.$inferInsert;

export type ClearanceFormStatus = ClearanceForm['status'];
export type UserRole = User['role'];
export type ItemStatus = Item['status'];
export type ItemCondition = ItemStock['condition'];
export type UnitOfMeasure = Item['unitOfMeasure'];
export type BorrowRequestStatus = BorrowRequest['status'];
export type BorrowRequestItemStatus = BorrowRequestItem['status'];
export type ItemRequestStatus = ItemRequest['status'];
export type ItemClearanceStatus = ItemClearance['status'];
export type MovementType = StockMovement['movementType'];
export type StockState = StockMovement['fromState'];

// ============================================================================
// STOCK MANAGEMENT HELPER FUNCTIONS - UPDATED
// ============================================================================

/**
 * Calculate available stock for borrowing
 */
export function getAvailableStock(stock: ItemStock): number {
  return stock.inStorage;
}

/**
 * Calculate total stock across all states
 */
export function getTotalStock(stock: ItemStock): number {
  return stock.inStorage + stock.onBorrow + stock.inClearance + stock.seeded;
}

/**
 * Check if sufficient stock is available for borrowing
 */
export function hasAvailableStock(stock: ItemStock, requestedQuantity: number): boolean {
  return stock.inStorage >= requestedQuantity;
}

// ============================================================================
// PRODUCT CODE PARSER (unchanged from original)
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

export function parseProductCode(productCode: string): ParsedProductCode {
  const cleanCode = productCode.trim().toUpperCase();
  
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
  
  const brandCode = cleanCode.substring(0, 3);
  const division = cleanCode.substring(3, 5);
  const category = cleanCode.substring(5, 7);
  const sequence = cleanCode.substring(7, 12);
  
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

export function validateProductCode(productCode: string): { isValid: boolean; error?: string } {
  const parsed = parseProductCode(productCode);
  return {
    isValid: parsed.isValid,
    error: parsed.error
  };
}
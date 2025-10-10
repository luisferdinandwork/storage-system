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

// Items table with updated status
export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  productCode: text('product_code').notNull().unique(),
  description: text('description').notNull(),
  brandCode: text('brand_code').notNull(),
  productGroup: text('product_group').notNull(),
  productDivision: text('product_division').notNull(),
  productCategory: text('product_category').notNull(),
  inventory: integer('inventory').notNull().default(0),
  vendor: text('vendor').notNull(),
  period: text('period').notNull(),
  season: text('season').notNull(),
  gender: text('gender').notNull(),
  mould: text('mould').notNull(),
  tier: text('tier').notNull(),
  silo: text('silo').notNull(),
  location: text('location', { enum: ['Storage 1', 'Storage 2', 'Storage 3'] }),
  unitOfMeasure: text('unit_of_measure', { enum: ['PCS', 'PRS'] }).notNull().default('PCS'),
  condition: text('condition', { enum: ['excellent', 'good', 'fair', 'poor'] }).notNull().default('good'),
  conditionNotes: text('condition_notes'),
  status: text('status', { 
    enum: ['pending_approval', 'approved', 'available', 'borrowed', 'in_clearance', 'rejected'] 
  }).notNull().default('pending_approval'),
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
    enum: ['pending_manager', 'pending_storage', 'approved', 'rejected', 'active', 'overdue', 'returned'] 
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
  metadata: jsonb('metadata').notNull(), // Store all item data at time of clearance
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

// Type exports for use in your application
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

// Additional useful types
export type UserRole = User['role'];
export type ItemStatus = Item['status'];
export type ItemCondition = Item['condition'];
export type ItemLocation = Item['location'];
export type UnitOfMeasure = Item['unitOfMeasure'];
export type BorrowRequestStatus = BorrowRequest['status'];
export type ReturnRequestStatus = ReturnRequest['status'];
export type ItemRequestStatus = ItemRequest['status'];
export type ItemClearanceStatus = ItemClearance['status'];
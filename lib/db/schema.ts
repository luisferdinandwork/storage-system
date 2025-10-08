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

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role', { enum: ['admin', 'manager', 'user'] }).notNull().default('user'),
  departmentId: uuid('department_id').references(() => departments.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Items table
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
  location: text('location', { enum: ['Storage 1', 'Storage 2', 'Storage 3'] }).notNull().default('Storage 1'),
  unitOfMeasure: text('unit_of_measure', { enum: ['PCS', 'PRS'] }).notNull().default('PCS'),
  condition: text('condition', { enum: ['excellent', 'good', 'fair', 'poor'] }).notNull().default('good'),
  conditionNotes: text('condition_notes'),
  status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
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

// Item archives table
export const itemArchives = pgTable('item_archives', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: uuid('item_id').references(() => items.id).notNull(),
  archivedBy: uuid('archived_by').references(() => users.id).notNull(),
  archivedAt: timestamp('archived_at').defaultNow().notNull(),
  reason: text('reason').notNull(),
  archivedInventory: integer('archived_inventory').notNull(),
  archivedCondition: text('archived_condition').notNull(),
  archivedConditionNotes: text('archived_condition_notes'),
  archivedImages: jsonb('archived_images').notNull(), // Store image data as JSON
  metadata: jsonb('metadata').notNull(), // Store all item data at time of archiving
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
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'active', 'returned'] }).notNull().default('pending'),
  managerApproved: boolean('manager_approved').default(false),
  adminApproved: boolean('admin_approved').default(false),
  managerApprovedBy: uuid('manager_approved_by').references(() => users.id),
  adminApprovedBy: uuid('admin_approved_by').references(() => users.id),
  managerApprovedAt: timestamp('manager_approved_at'),
  adminApprovedAt: timestamp('admin_approved_at'),
  rejectionReason: text('rejection_reason'),
  returnedAt: timestamp('returned_at'),
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
  borrowRequests: many(borrowRequests),
  managerApprovals: many(borrowRequests, { relationName: 'managerApproval' }),
  adminApprovals: many(borrowRequests, { relationName: 'adminApproval' }),
  itemArchives: many(itemArchives),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [items.createdBy],
    references: [users.id],
  }),
  images: many(itemImages),
  borrowRequests: many(borrowRequests),
  archives: many(itemArchives),
}));

export const itemImagesRelations = relations(itemImages, ({ one }) => ({
  item: one(items, {
    fields: [itemImages.itemId],
    references: [items.id],
  }),
}));

export const itemArchivesRelations = relations(itemArchives, ({ one }) => ({
  item: one(items, {
    fields: [itemArchives.itemId],
    references: [items.id],
  }),
  archivedBy: one(users, {
    fields: [itemArchives.archivedBy],
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
  adminApprovedBy: one(users, {
    fields: [borrowRequests.adminApprovedBy],
    references: [users.id],
    relationName: 'adminApproval',
  }),
}));

// Type exports for use in your application
export type Department = typeof departments.$inferSelect;
export type User = typeof users.$inferSelect;
export type Item = typeof items.$inferSelect;
export type ItemImage = typeof itemImages.$inferSelect;
export type ItemArchive = typeof itemArchives.$inferSelect;
export type BorrowRequest = typeof borrowRequests.$inferSelect;
import { pgTable, text, timestamp, boolean, uuid, integer } from 'drizzle-orm/pg-core';
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

// Items table (master item definition)
export const items = pgTable('items', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category', { enum: ['shoes', 'apparel', 'accessories', 'equipment'] }).notNull(),
  addedBy: uuid('added_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Item sizes table (each size has its own inventory)
export const itemSizes = pgTable('item_sizes', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: uuid('item_id').references(() => items.id, { onDelete: 'cascade' }).notNull(),
  size: text('size').notNull(), // e.g., "S", "M", "L", "XL", "40", "41", "42"
  quantity: integer('quantity').notNull().default(0), // Total quantity for this size
  available: integer('available').notNull().default(0), // Available quantity for this size
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Borrow requests table
export const borrowRequests = pgTable('borrow_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemId: uuid('item_id').references(() => items.id).notNull(),
  itemSizeId: uuid('item_size_id').references(() => itemSizes.id).notNull(),
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

// Item removal history table
export const itemRemovals = pgTable('item_removals', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemSizeId: uuid('item_size_id').references(() => itemSizes.id).notNull(),
  removedBy: uuid('removed_by').references(() => users.id).notNull(),
  quantityRemoved: integer('quantity_removed').notNull(),
  reason: text('reason').notNull(),
  removedAt: timestamp('removed_at').defaultNow().notNull(),
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
  itemsAdded: many(items),
  borrowRequests: many(borrowRequests),
  managerApprovals: many(borrowRequests, { relationName: 'managerApproval' }),
  adminApprovals: many(borrowRequests, { relationName: 'adminApproval' }),
  itemRemovals: many(itemRemovals),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  addedBy: one(users, {
    fields: [items.addedBy],
    references: [users.id],
  }),
  sizes: many(itemSizes),
  borrowRequests: many(borrowRequests),
}));

export const itemSizesRelations = relations(itemSizes, ({ one, many }) => ({
  item: one(items, {
    fields: [itemSizes.itemId],
    references: [items.id],
  }),
  borrowRequests: many(borrowRequests),
  removals: many(itemRemovals),
}));

export const borrowRequestsRelations = relations(borrowRequests, ({ one }) => ({
  item: one(items, {
    fields: [borrowRequests.itemId],
    references: [items.id],
  }),
  itemSize: one(itemSizes, {
    fields: [borrowRequests.itemSizeId],
    references: [itemSizes.id],
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

export const itemRemovalsRelations = relations(itemRemovals, ({ one }) => ({
  itemSize: one(itemSizes, {
    fields: [itemRemovals.itemSizeId],
    references: [itemSizes.id],
  }),
  removedBy: one(users, {
    fields: [itemRemovals.removedBy],
    references: [users.id],
  }),
}));

// Type exports for use in your application
export type Department = typeof departments.$inferSelect;
export type User = typeof users.$inferSelect;
export type Item = typeof items.$inferSelect;
export type ItemSize = typeof itemSizes.$inferSelect;
export type BorrowRequest = typeof borrowRequests.$inferSelect;
export type ItemRemoval = typeof itemRemovals.$inferSelect;
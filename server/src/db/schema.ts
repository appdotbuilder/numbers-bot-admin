import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  pgEnum 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const sellerStatusEnum = pgEnum('seller_status', ['active', 'inactive', 'banned']);
export const numberStatusEnum = pgEnum('number_status', ['available', 'rented', 'accepted', 'completed', 'cancelled', 'returned_to_queue']);

// Buyers table
export const l4_buyers = pgTable('l4_buyers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  is_banned: boolean('is_banned').notNull().default(false),
  ban_reason: text('ban_reason'), // Nullable by default
  mode: text('mode').notNull(),
  chat_id: text('chat_id').notNull().unique(),
  max_numbers_per_branch: integer('max_numbers_per_branch').notNull().default(10),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Sellers table
export const l4_sellers = pgTable('l4_sellers', {
  id: serial('id').primaryKey(),
  telegram_id: text('telegram_id').notNull().unique(),
  status: sellerStatusEnum('status').notNull().default('active'),
  status_comment: text('status_comment'), // Nullable by default
  permanent_rounding_bonus: numeric('permanent_rounding_bonus', { precision: 10, scale: 2 }).notNull().default('0'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Numbers table
export const l4_numbers = pgTable('l4_numbers', {
  id: serial('id').primaryKey(),
  phone_number: text('phone_number').notNull().unique(),
  country: text('country').notNull(),
  type: text('type').notNull(),
  status: numberStatusEnum('status').notNull().default('available'),
  buyer_id: integer('buyer_id'), // Nullable foreign key
  seller_id: integer('seller_id'), // Nullable foreign key
  rented_at: timestamp('rented_at'), // Nullable
  completed_at: timestamp('completed_at'), // Nullable
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Billing records table for tracking payments
export const l4_billing_records = pgTable('l4_billing_records', {
  id: serial('id').primaryKey(),
  buyer_id: integer('buyer_id').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description').notNull(),
  billing_date: timestamp('billing_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const buyersRelations = relations(l4_buyers, ({ many }) => ({
  numbers: many(l4_numbers),
  billingRecords: many(l4_billing_records)
}));

export const sellersRelations = relations(l4_sellers, ({ many }) => ({
  numbers: many(l4_numbers)
}));

export const numbersRelations = relations(l4_numbers, ({ one }) => ({
  buyer: one(l4_buyers, {
    fields: [l4_numbers.buyer_id],
    references: [l4_buyers.id]
  }),
  seller: one(l4_sellers, {
    fields: [l4_numbers.seller_id],
    references: [l4_sellers.id]
  })
}));

export const billingRecordsRelations = relations(l4_billing_records, ({ one }) => ({
  buyer: one(l4_buyers, {
    fields: [l4_billing_records.buyer_id],
    references: [l4_buyers.id]
  })
}));

// TypeScript types for the table schemas
export type Buyer = typeof l4_buyers.$inferSelect;
export type NewBuyer = typeof l4_buyers.$inferInsert;

export type Seller = typeof l4_sellers.$inferSelect;
export type NewSeller = typeof l4_sellers.$inferInsert;

export type NumberRecord = typeof l4_numbers.$inferSelect;
export type NewNumber = typeof l4_numbers.$inferInsert;

export type BillingRecord = typeof l4_billing_records.$inferSelect;
export type NewBillingRecord = typeof l4_billing_records.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  buyers: l4_buyers, 
  sellers: l4_sellers, 
  numbers: l4_numbers,
  billingRecords: l4_billing_records
};

export const tableRelations = {
  buyersRelations,
  sellersRelations,
  numbersRelations,
  billingRecordsRelations
};
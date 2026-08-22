/**
 * Customer master data (spec §11.1).
 *
 * Soft-deletion only: invoices/payments reference customers forever, so a
 * customer may be deactivated (`status = INACTIVE`) but never hard-deleted.
 */
import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { partyStatusEnum } from './enums';

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    /** Stable human identifier, e.g. CUS-2026-000001 (spec §10 style). */
    code: varchar('code', { length: 20 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    address: text('address'),
    taxId: varchar('tax_id', { length: 50 }),
    status: partyStatusEnum('status').notNull().default('ACTIVE'),
    /** Denormalized Mongo user snapshot (no cross-DB FK). */
    createdBy: varchar('created_by', { length: 64 }),
    createdByName: text('created_by_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('customers_code_unique').on(table.code),
    uniqueIndex('customers_email_unique').on(table.email),
    index('customers_name_idx').on(table.name),
    index('customers_status_idx').on(table.status),
  ]
);

export type CustomerRow = typeof customers.$inferSelect;
export type NewCustomerRow = typeof customers.$inferInsert;
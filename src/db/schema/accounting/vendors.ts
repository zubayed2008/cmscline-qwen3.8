/**
 * Vendor master data (spec §11.1).
 *
 * Soft-deletion only: bills/payments reference vendors forever, so a
 * vendor may be deactivated (`status = INACTIVE`) but never hard-deleted.
 */
import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { partyStatusEnum } from './enums';

export const vendors = pgTable(
  'vendors',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    /** Stable human identifier, e.g. VEN-2026-000001 (spec §10 style). */
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
    uniqueIndex('vendors_code_unique').on(table.code),
    uniqueIndex('vendors_email_unique').on(table.email),
    index('vendors_name_idx').on(table.name),
    index('vendors_status_idx').on(table.status),
  ]
);

export type VendorRow = typeof vendors.$inferSelect;
export type NewVendorRow = typeof vendors.$inferInsert;

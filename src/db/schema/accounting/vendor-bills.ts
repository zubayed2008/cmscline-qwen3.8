/**
 * Vendor bill header (spec §11.2) + normalized lines (spec §11.3).
 *
 * Accrual AP: at POST a posted journal entry performs
 *   Dr <expense accounts>          (subtotal, per line)
 *   Dr 2200 Tax Payable           (input tax, if any)
 *   Cr 2100 Accounts Payable      (total)
 * afterwards the bill is immutable except for payment application.
 */
import { sql } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { billStatusEnum } from './enums';
import { journalEntries } from './journal-entries';
import { vendors } from './vendors';

export const vendorBills = pgTable(
  'vendor_bills',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    /** Assigned at POST; NULL for drafts (unique index allows multiple NULLs). */
    billNumber: varchar('bill_number', { length: 30 }),
    vendorId: uuid('vendor_id')
      .notNull()
      .references(() => vendors.id, { onDelete: 'restrict' }),
    billDate: date('bill_date').notNull(),
    dueDate: date('due_date').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    subtotal: numeric('subtotal', { precision: 18, scale: 2 }).notNull().default('0.00'),
    taxAmount: numeric('tax_amount', { precision: 18, scale: 2 }).notNull().default('0.00'),
    totalAmount: numeric('total_amount', { precision: 18, scale: 2 }).notNull().default('0.00'),
    amountPaid: numeric('amount_paid', { precision: 18, scale: 2 }).notNull().default('0.00'),
    balanceDue: numeric('balance_due', { precision: 18, scale: 2 }).notNull().default('0.00'),
    status: billStatusEnum('status').notNull().default('DRAFT'),
    /** Posting (POST) journal entry; set atomically with status -> POSTED. */
    journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id, {
      onDelete: 'restrict',
    }),
    notes: text('notes'),
    /** Optimistic-lock counter (spec §25). */
    version: integer('version').notNull().default(1),
    createdBy: varchar('created_by', { length: 64 }),
    createdByName: text('created_by_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('vendor_bills_number_unique').on(table.billNumber),
    index('vendor_bills_vendor_status_idx').on(table.vendorId, table.status),
    index('vendor_bills_due_date_idx').on(table.dueDate),
    index('vendor_bills_journal_idx').on(table.journalEntryId),
  ]
);

export type VendorBillRow = typeof vendorBills.$inferSelect;
export type NewVendorBillRow = typeof vendorBills.$inferInsert;

export const vendorBillLines = pgTable(
  'vendor_bill_lines',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    billId: uuid('bill_id')
      .notNull()
      .references(() => vendorBills.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    description: text('description'),
    quantity: numeric('quantity', { precision: 12, scale: 4 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 18, scale: 2 }).notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
    taxAmount: numeric('tax_amount', { precision: 18, scale: 2 }).notNull().default('0.00'),
    lineTotal: numeric('line_total', { precision: 18, scale: 2 }).notNull(),
    /** Expense account each line books to (accessed at POST). */
    accountId: uuid('account_id'),
  },
  (table) => [
    index('vendor_bill_lines_bill_idx').on(table.billId),
    uniqueIndex('vendor_bill_lines_bill_position_unique').on(table.billId, table.position),
  ]
);

export type VendorBillLineRow = typeof vendorBillLines.$inferSelect;
export type NewVendorBillLineRow = typeof vendorBillLines.$inferInsert;

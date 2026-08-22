/**
 * Customer invoice header (spec §11.2) + normalized lines (spec §11.3).
 *
 * Accrual AR: at ISSUE a posted journal entry performs
 *   Dr 1200 Accounts Receivable   (total)
 *   Cr <revenue accounts>         (subtotal, per line)
 *   Cr 2200 Tax Payable          (tax, if any)
 * afterwards the invoice is immutable except for payment application.
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
import { invoiceStatusEnum } from './enums';
import { journalEntries } from './journal-entries';
import { customers } from './customers';

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    /** Assigned at ISSUE; NULL for drafts (unique index allows multiple NULLs). */
    invoiceNumber: varchar('invoice_number', { length: 30 }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    issueDate: date('issue_date').notNull(),
    dueDate: date('due_date').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    subtotal: numeric('subtotal', { precision: 18, scale: 2 }).notNull().default('0.00'),
    taxAmount: numeric('tax_amount', { precision: 18, scale: 2 }).notNull().default('0.00'),
    totalAmount: numeric('total_amount', { precision: 18, scale: 2 }).notNull().default('0.00'),
    amountPaid: numeric('amount_paid', { precision: 18, scale: 2 }).notNull().default('0.00'),
    balanceDue: numeric('balance_due', { precision: 18, scale: 2 }).notNull().default('0.00'),
    status: invoiceStatusEnum('status').notNull().default('DRAFT'),
    /** Posting (ISSUE) journal entry; set atomically with status -> ISSUED. */
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
    uniqueIndex('invoices_number_unique').on(table.invoiceNumber),
    index('invoices_customer_status_idx').on(table.customerId, table.status),
    index('invoices_due_date_idx').on(table.dueDate),
    index('invoices_journal_idx').on(table.journalEntryId),
  ]
);

export type InvoiceRow = typeof invoices.$inferSelect;
export type NewInvoiceRow = typeof invoices.$inferInsert;

export const invoiceLines = pgTable(
  'invoice_lines',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    description: text('description'),
    quantity: numeric('quantity', { precision: 12, scale: 4 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 18, scale: 2 }).notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
    taxAmount: numeric('tax_amount', { precision: 18, scale: 2 }).notNull().default('0.00'),
    lineTotal: numeric('line_total', { precision: 18, scale: 2 }).notNull(),
    /** Revenue account each line books to (accessed at ISSUE). */
    accountId: uuid('account_id'),
  },
  (table) => [
    index('invoice_lines_invoice_idx').on(table.invoiceId),
    uniqueIndex('invoice_lines_invoice_position_unique').on(table.invoiceId, table.position),
  ]
);

export type InvoiceLineRow = typeof invoiceLines.$inferSelect;
export type NewInvoiceLineRow = typeof invoiceLines.$inferInsert;
/**
 * Payments (spec §12.1) + allocations (spec §12.2).
 *
 * A customer payment books:
 *   Dr <cash account>            (amount)
 *   Cr 1200 Accounts Receivable (amount)
 * and is allocated across one or more invoices; allocations can never
 * exceed the payment amount or an invoice's outstanding balance.
 */
import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { paymentStatusEnum, paymentTypeEnum } from './enums';
import { journalEntries } from './journal-entries';
import { customers } from './customers';
import { invoices } from './invoices';
import { vendors } from './vendors';
import { vendorBills } from './vendor-bills';

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    paymentNumber: varchar('payment_number', { length: 30 }).notNull(),
    paymentType: paymentTypeEnum('payment_type').notNull().default('CUSTOMER'),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'restrict' }),
    vendorId: uuid('vendor_id').references(() => vendors.id, { onDelete: 'restrict' }),
    paymentDate: date('payment_date').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    amount: numeric('amount', { precision: 18, scale: 2 }).notNull(),
    /** Cash/bank account credited - validated postable at record time. */
    cashAccountId: uuid('cash_account_id'),
    reference: varchar('reference', { length: 100 }),
    status: paymentStatusEnum('status').notNull().default('COMPLETED'),
    journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id, {
      onDelete: 'restrict',
    }),
    createdBy: varchar('created_by', { length: 64 }),
    createdByName: text('created_by_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('payments_number_unique').on(table.paymentNumber),
    index('payments_customer_date_idx').on(table.customerId, table.paymentDate),
    index('payments_vendor_date_idx').on(table.vendorId, table.paymentDate),
    index('payments_journal_idx').on(table.journalEntryId),
  ]
);

export type PaymentRow = typeof payments.$inferSelect;
export type NewPaymentRow = typeof payments.$inferInsert;

export const paymentAllocations = pgTable(
  'payment_allocations',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'cascade' }),
    /** Exactly one of invoiceId (customer) / vendorBillId (vendor) is set. */
    invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'restrict' }),
    vendorBillId: uuid('vendor_bill_id').references(() => vendorBills.id, {
      onDelete: 'restrict',
    }),
    allocatedAmount: numeric('allocated_amount', { precision: 18, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('payment_allocations_payment_invoice_unique').on(table.paymentId, table.invoiceId),
    uniqueIndex('payment_allocations_payment_bill_unique').on(table.paymentId, table.vendorBillId),
    index('payment_allocations_invoice_idx').on(table.invoiceId),
    index('payment_allocations_bill_idx').on(table.vendorBillId),
    // Engine-enforced invariant: every allocation targets exactly one document type.
    check(
      'payment_allocations_invoice_or_bill',
      sql`((${table.invoiceId} IS NOT NULL AND ${table.vendorBillId} IS NULL) OR (${table.invoiceId} IS NULL AND ${table.vendorBillId} IS NOT NULL))`
    ),
  ]
);

export type PaymentAllocationRow = typeof paymentAllocations.$inferSelect;
export type NewPaymentAllocationRow = typeof paymentAllocations.$inferInsert;
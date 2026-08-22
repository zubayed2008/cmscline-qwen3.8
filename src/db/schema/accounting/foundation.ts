/**
 * Foundation accounting tables.
 *
 * - `accounts`          : chart of accounts (self-referencing hierarchy)
 * - `accounting_periods`: fiscal periods with open/close lifecycle
 * - `document_counters` : per-year sequences backing JE-/INV-/PAY-/BILL-
 *                          numbering (spec §10); incremented inside the same
 *                          transaction that inserts the document row
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { accountTypeEnum, normalBalanceEnum, periodStatusEnum } from './enums';

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    code: varchar('code', { length: 20 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    type: accountTypeEnum('type').notNull(),
    normalBalance: normalBalanceEnum('normal_balance').notNull(),
    parentId: uuid('parent_id').references((): AnyPgColumn => accounts.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').notNull().default(true),
    /** Group/header accounts receive no postings (spec §4); leaf accounts post. */
    isPostable: boolean('is_postable').notNull().default(true),
    /** Denormalized Mongo user display-name snapshot (no cross-DB FK). */
    createdByName: text('created_by_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('accounts_code_unique').on(table.code),
    index('accounts_type_idx').on(table.type),
    index('accounts_parent_idx').on(table.parentId),
    // Engine-enforced invariant: an account's normal balance must match its
    // type (Assets/Expenses are Debit-normal, the rest Credit-normal).
    check(
      'accounts_normal_balance_matches_type',
      sql`(
        (${table.type} = 'Asset' AND ${table.normalBalance} = 'Debit') OR
        (${table.type} = 'Expense' AND ${table.normalBalance} = 'Debit') OR
        (${table.type} = 'Liability' AND ${table.normalBalance} = 'Credit') OR
        (${table.type} = 'Equity' AND ${table.normalBalance} = 'Credit') OR
        (${table.type} = 'Revenue' AND ${table.normalBalance} = 'Credit')
      )`
    ),
  ]
);

export const accountingPeriods = pgTable(
  'accounting_periods',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 100 }).notNull(),
    fiscalYear: integer('fiscal_year').notNull(),
    periodNumber: integer('period_number').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    status: periodStatusEnum('status').notNull().default('OPEN'),
    closedBy: text('closed_by'),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('accounting_periods_year_number_unique').on(table.fiscalYear, table.periodNumber),
    index('accounting_periods_status_idx').on(table.status),
    // Engine-enforced invariant: a period cannot end before it starts.
    check(
      'accounting_periods_date_range',
      sql`${table.endDate} >= ${table.startDate}`
    ),
  ]
);

export const documentCounters = pgTable(
  'document_counters',
  {
    docType: varchar('doc_type', { length: 20 }).notNull(),
    year: integer('year').notNull(),
    lastNumber: integer('last_number').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Composite primary key via unique index on the natural key pair.
    uniqueIndex('document_counters_doc_type_year_pk').on(table.docType, table.year),
  ]
);

export type AccountRow = typeof accounts.$inferSelect;
export type NewAccountRow = typeof accounts.$inferInsert;
export type AccountingPeriodRow = typeof accountingPeriods.$inferSelect;
export type NewAccountingPeriodRow = typeof accountingPeriods.$inferInsert;
export type DocumentCounterRow = typeof documentCounters.$inferSelect;

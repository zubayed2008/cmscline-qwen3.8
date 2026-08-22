/**
 * Journal entries header table (spec §5.1).
 *
 * The lifecycle state machine lives in JournalService:
 *   DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTED -> REVERSED
 * POSTED rows are immutable; corrections happen exclusively through
 * reversing entries (`reversalOfId` cross-link, spec §7.2).
 */
import { sql } from 'drizzle-orm';
import {
  check,
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
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { journalStatusEnum, sourceTypeEnum } from './enums';
import { accounts, accountingPeriods } from './foundation';

export const journalEntries = pgTable(
  'journal_entries',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    /** Human identifier, e.g. JE-2026-000001 (spec §10). Never reused. */
    entryNumber: varchar('entry_number', { length: 30 }).notNull(),
    /** Business date - drives period resolution. */
    entryDate: date('entry_date').notNull(),
    /** Set once, atomically with status -> POSTED. */
    postingDate: date('posting_date'),
    accountingPeriodId: uuid('accounting_period_id').references(
      () => accountingPeriods.id,
      { onDelete: 'set null' }
    ),
    memo: text('memo'),
    reference: varchar('reference', { length: 100 }),
    sourceType: sourceTypeEnum('source_type').notNull().default('MANUAL'),
    /** Linkage to the originating business document (spec §19). Mongo ids fit in 64 chars. */
    sourceId: varchar('source_id', { length: 64 }),
    status: journalStatusEnum('status').notNull().default('DRAFT'),
    /** Denormalized control totals kept in lockstep with postings rows. */
    totalDebit: numeric('total_debit', { precision: 18, scale: 2 })
      .notNull()
      .default('0.00'),
    totalCredit: numeric('total_credit', { precision: 18, scale: 2 })
      .notNull()
      .default('0.00'),
    /** Optimistic-lock counter (spec §25). Bumped on every mutation. */
    version: integer('version').notNull().default(1),
    createdBy: varchar('created_by', { length: 64 }),
    /** Denormalized Mongo user display-name snapshot (no cross-DB FK). */
    createdByName: text('created_by_name'),
    approvedBy: varchar('approved_by', { length: 64 }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    postedBy: varchar('posted_by', { length: 64 }),
    postedAt: timestamp('posted_at', { withTimezone: true }),
    reversedBy: varchar('reversed_by', { length: 64 }),
    reversedAt: timestamp('reversed_at', { withTimezone: true }),
    /** Self cross-link to the entry this one reverses (spec §7.2). */
    reversalOfId: uuid('reversal_of_id').references((): AnyPgColumn => journalEntries.id, {
      onDelete: 'restrict',
    }),
    reversalReason: text('reversal_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('journal_entries_number_unique').on(table.entryNumber),
    index('journal_entries_status_idx').on(table.status),
    index('journal_entries_entry_date_idx').on(table.entryDate),
    index('journal_entries_source_idx').on(table.sourceType, table.sourceId),
    index('journal_entries_reversal_of_idx').on(table.reversalOfId),
  ]
);

export type JournalEntryRow = typeof journalEntries.$inferSelect;
export type NewJournalEntryRow = typeof journalEntries.$inferInsert;

/**
 * Journal posting lines (spec §5.1) - one row per Dr/Cr amount.
 *
 * Engine-enforced invariant: a line carries an amount on exactly ONE side
 * (never both, never neither). Rows are inserted in the same transaction as
 * their parent entry; POSTED entries' rows are immutable (RESTRICT).
 */
export const journalPostings = pgTable(
  'journal_postings',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    journalEntryId: uuid('journal_entry_id')
      .notNull()
      .references(() => journalEntries.id, { onDelete: 'restrict' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    debit: numeric('debit', { precision: 18, scale: 2 }).notNull().default('0.00'),
    credit: numeric('credit', { precision: 18, scale: 2 }).notNull().default('0.00'),
    description: text('description'),
    lineNumber: integer('line_number').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('journal_postings_entry_idx').on(table.journalEntryId),
    index('journal_postings_account_idx').on(table.accountId),
    check(
      'journal_postings_one_sided_amount',
      sql`${table.debit} >= 0 AND ${table.credit} >= 0 AND NOT (${table.debit} > 0 AND ${table.credit} > 0)`
    ),
    check('journal_postings_line_number_positive', sql`${table.lineNumber} >= 1`),
  ]
);

export type JournalPostingRow = typeof journalPostings.$inferSelect;
export type NewJournalPostingRow = typeof journalPostings.$inferInsert;

/**
 * PostgreSQL enum definitions for the accounting schema.
 *
 * The value tuples here MIRROR the domain unions in
 * `src/types/accounting-types.ts` 1:1. Compile-time guards at the bottom of
 * this file fail the build if either side drifts.
 *
 * NOTE: imports from the types file are `import type` only, so they are
 * erased before drizzle-kit loads this file (the CLI does not resolve
 * tsconfig path aliases).
 */
import { pgEnum } from 'drizzle-orm/pg-core';
import type {
  AccountType,
  AccountingSourceType,
  BillStatus,
  InvoiceStatus,
  JournalStatus,
  NormalBalance,
  PartyStatus,
  PaymentType,
  PeriodStatus,
} from '@/types/accounting-types';

// -- Value tuples (single runtime source of truth for the pgEnums) ----------

export const ACCOUNT_TYPE_VALUES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as const;
export const NORMAL_BALANCE_VALUES = ['Debit', 'Credit'] as const;
export const JOURNAL_STATUS_VALUES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'POSTED',
  'REVERSED',
] as const;
export const INVOICE_STATUS_VALUES = [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'VOIDED',
] as const;
export const BILL_STATUS_VALUES = [
  'DRAFT',
  'APPROVED',
  'POSTED',
  'PARTIALLY_PAID',
  'PAID',
  'CANCELLED',
] as const;
export const PERIOD_STATUS_VALUES = ['OPEN', 'CLOSED'] as const;
export const PARTY_STATUS_VALUES = ['ACTIVE', 'INACTIVE'] as const;
export const PAYMENT_TYPE_VALUES = ['CUSTOMER', 'VENDOR'] as const;
export const SOURCE_TYPE_VALUES = [
  'MANUAL',
  'OPENING_BALANCE',
  'INVOICE',
  'CUSTOMER_PAYMENT',
  'VENDOR_BILL',
  'VENDOR_PAYMENT',
] as const;
/** Spec §12.1 defines only a present `status`; v1 uses COMPLETED (default). Extensible via ALTER TYPE. */
export const PAYMENT_STATUS_VALUES = ['COMPLETED'] as const;

// -- pgEnums ----------------------------------------------------------------

export const accountTypeEnum = pgEnum('account_type', ACCOUNT_TYPE_VALUES);
export const normalBalanceEnum = pgEnum('normal_balance', NORMAL_BALANCE_VALUES);
export const journalStatusEnum = pgEnum('journal_status', JOURNAL_STATUS_VALUES);
export const invoiceStatusEnum = pgEnum('invoice_status', INVOICE_STATUS_VALUES);
export const billStatusEnum = pgEnum('bill_status', BILL_STATUS_VALUES);
export const periodStatusEnum = pgEnum('period_status', PERIOD_STATUS_VALUES);
export const partyStatusEnum = pgEnum('party_status', PARTY_STATUS_VALUES);
export const paymentTypeEnum = pgEnum('payment_type', PAYMENT_TYPE_VALUES);
export const sourceTypeEnum = pgEnum('source_type', SOURCE_TYPE_VALUES);
export const paymentStatusEnum = pgEnum('payment_status', PAYMENT_STATUS_VALUES);

// -- Compile-time mirror guards ---------------------------------------------

type ExactMatch<T extends readonly string[], U extends string> =
  Exclude<T[number], U> extends never
    ? Exclude<U, T[number]> extends never
      ? true
      : { error: 'union members missing from enum values'; missing: Exclude<U, T[number]> }
    : { error: 'enum values not present in domain union'; extra: Exclude<T[number], U> };

/**
 * Fails compilation if any pgEnum tuple drifts from its domain union
 * (in either direction).
 */
const ENUM_UNION_GUARDS: [
  ExactMatch<typeof ACCOUNT_TYPE_VALUES, AccountType>,
  ExactMatch<typeof NORMAL_BALANCE_VALUES, NormalBalance>,
  ExactMatch<typeof JOURNAL_STATUS_VALUES, JournalStatus>,
  ExactMatch<typeof INVOICE_STATUS_VALUES, InvoiceStatus>,
  ExactMatch<typeof BILL_STATUS_VALUES, BillStatus>,
  ExactMatch<typeof PERIOD_STATUS_VALUES, PeriodStatus>,
  ExactMatch<typeof PARTY_STATUS_VALUES, PartyStatus>,
  ExactMatch<typeof PAYMENT_TYPE_VALUES, PaymentType>,
  ExactMatch<typeof SOURCE_TYPE_VALUES, AccountingSourceType>,
] = [true, true, true, true, true, true, true, true, true];

void ENUM_UNION_GUARDS;

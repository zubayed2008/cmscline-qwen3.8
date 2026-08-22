/**
 * Accounting Engine - Zod request contracts (Phase 18, Part 3).
 *
 * Kept separate from the content-CMS `schemas.ts`. Every API route parses
 * its body through these before any service call; server-side validation
 * is the security boundary (spec §23) - client-side validation is a UX
 * nicety only.
 *
 * Money rule: amounts are fixed 2-decimal strings, enforced by
 * `decimalStringSchema`. Any value that does not match `12` / `12.5` /
 * `12.50` is rejected.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitive scalars
// ---------------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PostgreSQL uuid primary key. */
export const uuidSchema = z
  .string()
  .regex(UUID_PATTERN, { message: 'Invalid UUID' })
  .transform((v) => v.toLowerCase());

/** Business date column (matching `date` columns: strict ISO day). */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD' });

/** Non-negative money string (`0`, `12.5`, `12.50`). */
export const decimalStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, {
    message: 'Amount must be a decimal string with at most 2 fraction digits',
  })
  .refine((v) => Number(v) >= 0, { message: 'Amount must not be negative' });

/** Strictly positive money string. */
export const positiveDecimalSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, {
    message: 'Amount must be a decimal string with at most 2 fraction digits',
  })
  .refine((v) => Number(v) > 0, { message: 'Amount must be greater than zero' });

// ---------------------------------------------------------------------------
// Journal engine (Part 2 routes carried into Part 3)
// ---------------------------------------------------------------------------

/** A single journal line: exactly ONE side carries a positive amount. */
const journalLineSchema = z.object({
  accountId: uuidSchema,
  debit: decimalStringSchema,
  credit: decimalStringSchema,
  description: z.string().max(200).optional(),
});

export const journalEntryCreateSchema = z.object({
  entryDate: isoDateSchema,
  memo: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
  lines: z
    .array(journalLineSchema)
    .min(2, { message: 'A journal entry requires at least two lines' })
    .refine((lines) => lines.some((l) => Number(l.debit) > 0), {
      message: 'At least one debit line is required',
    })
    .refine((lines) => lines.some((l) => Number(l.credit) > 0), {
      message: 'At least one credit line is required',
    }),
});

export const journalEntryUpdateSchema = z.object({
  entryDate: isoDateSchema.optional(),
  memo: z.string().max(500).nullable().optional(),
  reference: z.string().max(100).nullable().optional(),
  lines: z.array(journalLineSchema).min(2).optional(),
  /** Optimistic lock - must match the stored version. */
  expectedVersion: z.number().int().nonnegative(),
});

export const journalReverseSchema = z.object({
  reason: z.string().min(3).max(500),
});

// ---------------------------------------------------------------------------
// Chart of accounts
// ---------------------------------------------------------------------------

export const accountCreateSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9]+$/, { message: 'Code must be uppercase letters/digits' }),
  name: z.string().min(1).max(255),
  type: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']),
  parentId: uuidSchema.nullable().optional(),
  isPostable: z.boolean().optional(),
});

export const accountUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']).optional(),
  parentId: uuidSchema.nullable().optional(),
  isPostable: z.boolean().optional(),
  /** Soft activation toggle (admin toggling). */
  isActive: z.boolean().optional(),
});

export const periodActionSchema = z.object({
  reason: z.string().min(3).max(500),
});

// ---------------------------------------------------------------------------
// Accounts Receivable (Part 3)
// ---------------------------------------------------------------------------

export const customerCreateSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255).optional().or(z.literal('')).transform((v) => v || null),
  phone: z.string().max(50).optional().or(z.literal('')).transform((v) => v || null),
  address: z.string().max(1000).optional().or(z.literal('')).transform((v) => v || null),
  taxId: z.string().max(50).optional().or(z.literal('')).transform((v) => v || null),
});

export const customerUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  address: z.string().max(1000).nullable().optional(),
  taxId: z.string().max(50).nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const).optional(),
});

/** One line of an invoice; totals are computed server-side only. */
const invoiceLineSchema = z.object({
  accountId: uuidSchema,
  description: z.string().max(500).optional().or(z.literal('')).transform((v) => v || null),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unitPrice: positiveDecimalSchema,
  /** Percent in [0,100], applied tax-exclusive (spec §14). Default 0. */
  taxRate: z.number().min(0).max(100).optional(),
});

export const invoiceCreateSchema = z.object({
  customerId: uuidSchema,
  issueDate: isoDateSchema,
  dueDate: isoDateSchema,
  notes: z.string().max(2000).optional().or(z.literal('')).transform((v) => v || null),
  lines: z.array(invoiceLineSchema).min(1, { message: 'At least one line is required' }),
});

export const invoiceUpdateSchema = z.object({
  issueDate: isoDateSchema.optional(),
  dueDate: isoDateSchema.optional(),
  notes: z.string().max(2000).nullable().optional(),
  lines: z.array(invoiceLineSchema).min(1).optional(),
  /** Optimistic lock version. */
  expectedVersion: z.number().int().nonnegative(),
});

export const invoiceActionSchema = z.object({
  reason: z.string().min(3).max(500).optional(),
});

// ---------------------------------------------------------------------------
// Payments (Part 3)
// ---------------------------------------------------------------------------

const paymentAllocationSchema = z.object({
  invoiceId: uuidSchema,
  amount: positiveDecimalSchema,
});

export const paymentCreateSchema = z.object({
  customerId: uuidSchema,
  paymentDate: isoDateSchema,
  amount: positiveDecimalSchema,
  cashAccountId: uuidSchema,
  reference: z.string().max(100).optional().or(z.literal('')).transform((v) => v || null),
  /** Optional explicit allocation map. When omitted, FIFO auto-allocation. */
  allocations: z.array(paymentAllocationSchema).optional(),
});

export type CustomerCreateSchema = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateSchema = z.infer<typeof customerUpdateSchema>;
export type InvoiceCreateSchema = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdateSchema = z.infer<typeof invoiceUpdateSchema>;
export type PaymentCreateSchema = z.infer<typeof paymentCreateSchema>;
export type PeriodActionSchema = z.infer<typeof periodActionSchema>;
export type JournalReverseSchema = z.infer<typeof journalReverseSchema>;
/**
 * Customer invoice lifecycle (spec §11).
 *
 *   DRAFT -> ISSUED -> PARTIALLY_PAID -> PAID   (+ OVERDUE derived, CANCELLED)
 *
 * - Drafts carry no number; ISSUE assigns INV-YYYY-###### and posts a journal
 *   entry in the SAME transaction (spec §8):
 *       Dr 1200 Accounts Receivable   (total)
 *       Cr <revenue account(s)>       (subtotal, per line)
 *       Cr 2200 Tax Payable          (tax, if any)
 * - After issue the invoice is immutable except for payment application.
 * - CANCELLED is reachable only from DRAFT (nothing financially happened).
 */
import { and, asc, desc, eq, gt, inArray, type SQL } from 'drizzle-orm';
import { runInFinancialTransaction, type AccountingTx } from '@/db/pg-client';
import {
  invoiceLines,
  invoices,
  type InvoiceLineRow,
  type InvoiceRow,
} from '@/db/schema/accounting';
import {
  AccountingNotFoundError,
  AccountingValidationError,
  ConcurrentModificationError,
  DocumentNotEditableError,
  PaymentExceedsBalanceError,
} from '@/utils/accounting-errors';
import {
  addMoney,
  compareMoney,
  isMoneyZero,
  multiplyMoney,
  percentOfMoney,
  subtractMoney,
} from '@/utils/money';
import { AccountService } from './account-service';
import { JournalService } from './journal-service';
import { NumberService } from './number-service';
import { resolveExec, type ActorContext, type AccountingExec } from './service-types';
import { auditAccountingEvent } from './audit-bridge';

/** Shared control account codes from the seeded CoA (spec §29). */
export const AR_ACCOUNT_CODE = '1200';
export const TAX_PAYABLE_ACCOUNT_CODE = '2200';

/** A line a client supplies when creating/editing an invoice draft. */
export interface InvoiceLineInput {
  accountId: string;
  description?: string | null;
  quantity: number | string;
  unitPrice: string;
  taxRate?: number;
}

export interface CreateInvoiceInput {
  customerId: string;
  issueDate: string;
  dueDate: string;
  notes?: string | null;
  lines: InvoiceLineInput[];
}

export interface UpdateInvoiceDraftInput {
  issueDate?: string;
  dueDate?: string;
  notes?: string | null;
  lines?: InvoiceLineInput[];
}

export interface InvoiceTotals {
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
}

export interface InvoiceWithLines {
  invoice: InvoiceRow;
  lines: InvoiceLineRow[];
}

const BILLABLE_STATUSES = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] as const;

/** Computes lineTotal and per-line tax (tax-exclusive, half-up rounding). */
export function computeLineTotals(line: InvoiceLineInput): {
  lineTotal: string;
  taxAmount: string;
} {
  const lineTotal = multiplyMoney(line.quantity, line.unitPrice);
  const taxRate = line.taxRate ?? 0;
  const taxAmount = taxRate > 0 ? percentOfMoney(lineTotal, taxRate) : '0.00';
  return { lineTotal, taxAmount };
}

/** Aggregates invoice-wide subtotal / tax / total. */
export function computeInvoiceTotals(lines: readonly InvoiceLineInput[]): InvoiceTotals {
  let subtotal = '0.00';
  let taxAmount = '0.00';
  for (const line of lines) {
    const computed = computeLineTotals(line);
    subtotal = addMoney(subtotal, computed.lineTotal);
    taxAmount = addMoney(taxAmount, computed.taxAmount);
  }
  return { subtotal, taxAmount, totalAmount: addMoney(subtotal, taxAmount) };
}

/** Row-locked fetch; every mutating flow re-locks before writing. */
export async function lockInvoiceRow(exec: AccountingTx, id: string): Promise<InvoiceRow> {
  const [row] = await exec
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .for('update');
  if (!row) throw new AccountingNotFoundError('Invoice', id);
  return row;
}

/** Loads an invoice's lines ordered by position. */
export async function loadInvoiceLines(
  exec: AccountingExec,
  invoiceId: string
): Promise<InvoiceLineRow[]> {
  return exec
    .select()
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, invoiceId))
    .orderBy(asc(invoiceLines.position));
}

/** Open (billable) invoices of a customer, oldest due first (FIFO allocation). */
export async function listOpenInvoicesForCustomer(
  exec: AccountingExec,
  customerId: string
): Promise<InvoiceRow[]> {
  return exec
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.customerId, customerId),
        inArray(invoices.status, [...BILLABLE_STATUSES]),
        gt(invoices.balanceDue, '0.00')
      )
    )
    .orderBy(asc(invoices.dueDate), asc(invoices.createdAt));
}

/** Single-step state gate with a friendly message. */
function requireInvoiceStatus(
  invoice: InvoiceRow,
  expected: InvoiceRow['status'],
  action: string
): void {
  if (invoice.status !== expected) {
    throw new DocumentNotEditableError(
      invoice.invoiceNumber ?? `invoice ${invoice.id}`,
      `${invoice.status} (${action} requires ${expected})`
    );
  }
}

/** Optimistic-lock gate (spec §25). */
function assertVersion(invoice: InvoiceRow, expectedVersion: number | undefined): void {
  if (expectedVersion !== undefined && invoice.version !== expectedVersion) {
    throw new ConcurrentModificationError(invoice.invoiceNumber ?? invoice.id);
  }
}

function yearOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

export const InvoiceService = {
  /**
   * Creates a DRAFT invoice (no number, no accounting). Totals are always
   * computed SERVER-side from raw line inputs (spec §23) - never trusted
   * from the client.
   */
  async createDraft(
    input: CreateInvoiceInput,
    ctx: ActorContext,
    exec?: AccountingTx
  ): Promise<InvoiceWithLines> {
    const write = async (tx: AccountingTx): Promise<InvoiceWithLines> => {
      const { subtotal, taxAmount, totalAmount } = computeInvoiceTotals(input.lines);
      const currency = process.env.ACCOUNTING_BASE_CURRENCY ?? 'USD';

      const [invoice] = await tx
        .insert(invoices)
        .values({
          customerId: input.customerId,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          currency,
          subtotal,
          taxAmount,
          totalAmount,
          amountPaid: '0.00',
          balanceDue: totalAmount,
          status: 'DRAFT',
          notes: input.notes ?? null,
          createdBy: ctx.userId,
          createdByName: ctx.userName,
        })
        .returning();

      const lines = input.lines.map((line, index) => {
        const computed = computeLineTotals(line);
        return {
          invoiceId: invoice!.id,
          position: index + 1,
          description: line.description ?? null,
          quantity: String(line.quantity),
          unitPrice: line.unitPrice,
          taxRate: (line.taxRate ?? 0).toFixed(2),
          taxAmount: computed.taxAmount,
          lineTotal: computed.lineTotal,
          accountId: line.accountId,
        };
      });
      await tx.insert(invoiceLines).values(lines);

      return { invoice: invoice!, lines: lines as unknown as InvoiceLineRow[] };
    };
    return exec ? write(exec) : runInFinancialTransaction(write);
  },

  /**
   * Rewrites a DRAFT's lines/dates/notes. Optimistic lock: pass the version
   * the caller last read or face ConcurrentModificationError.
   */
  async updateDraft(
    id: string,
    input: UpdateInvoiceDraftInput,
    ctx: ActorContext,
    expectedVersion?: number,
    exec?: AccountingTx
  ): Promise<InvoiceWithLines> {
    const write = async (tx: AccountingTx): Promise<InvoiceWithLines> => {
      const invoice = await lockInvoiceRow(tx, id);
      requireInvoiceStatus(invoice, 'DRAFT', 'edit');
      assertVersion(invoice, expectedVersion);

      const lines = input.lines
        ? input.lines.map((line, index) => {
            const computed = computeLineTotals(line);
            return {
              invoiceId: id,
              position: index + 1,
              description: line.description ?? null,
              quantity: String(line.quantity),
              unitPrice: line.unitPrice,
              taxRate: (line.taxRate ?? 0).toFixed(2),
              taxAmount: computed.taxAmount,
              lineTotal: computed.lineTotal,
              accountId: line.accountId,
            };
          })
        : null;

      const totals = lines ? computeInvoiceTotals(input.lines!) : null;

      if (lines) {
        await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, id));
        await tx.insert(invoiceLines).values(lines);
      }

      const [updated] = await tx
        .update(invoices)
        .set({
          issueDate: input.issueDate ?? invoice.issueDate,
          dueDate: input.dueDate ?? invoice.dueDate,
          notes: input.notes !== undefined ? input.notes : invoice.notes,
          ...(totals
            ? {
                subtotal: totals.subtotal,
                taxAmount: totals.taxAmount,
                totalAmount: totals.totalAmount,
                balanceDue: totals.totalAmount,
              }
            : {}),
          version: invoice.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(invoices.id, id), eq(invoices.version, invoice.version)))
        .returning();

      return {
        invoice: updated!,
        lines: lines ? (lines as unknown as InvoiceLineRow[]) : await loadInvoiceLines(tx, id),
      };
    };
    return exec ? write(exec) : runInFinancialTransaction(write);
  },

  /**
   * DRAFT -> ISSUED. Books the accrual JE atomically with the status flip in
   * ONE transaction (spec §8): INV number assigned now and never reused, JE
   * created POSTED via JournalService.createPosted. Idempotent callers pass
   * the key through the route wrapper (outside this method).
   */
  async issue(id: string, ctx: ActorContext, exec?: AccountingTx): Promise<InvoiceWithLines> {
    const write = async (tx: AccountingTx): Promise<InvoiceWithLines> => {
      const invoice = await lockInvoiceRow(tx, id);
      requireInvoiceStatus(invoice, 'DRAFT', 'issue');
      const lines = await loadInvoiceLines(tx, id);
      if (lines.length === 0) {
        throw new AccountingValidationError('Cannot issue an invoice without lines');
      }

      const totals = computeInvoiceTotals(
        lines.map((line) => ({
          accountId: line.accountId ?? '',
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: Number(line.taxRate),
        }))
      );
      if (compareMoney(totals.totalAmount, '0.00') <= 0) {
        throw new AccountingValidationError('Invoice total must be greater than zero');
      }

      const arAccount = await AccountService.getAccountByCode(tx, AR_ACCOUNT_CODE);
      if (!arAccount) {
        throw new AccountingValidationError(
          `Control account ${AR_ACCOUNT_CODE} (Accounts Receivable) is not configured - run seed:accounting`
        );
      }
      await AccountService.getPostableAccount(tx, arAccount.id);

      const hasTax = compareMoney(totals.taxAmount, '0.00') > 0;
      const taxAccount = hasTax
        ? await AccountService.getAccountByCode(tx, TAX_PAYABLE_ACCOUNT_CODE)
        : null;
      if (hasTax && !taxAccount) {
        throw new AccountingValidationError(
          `Control account ${TAX_PAYABLE_ACCOUNT_CODE} (Tax Payable) is not configured - run seed:accounting`
        );
      }
      if (taxAccount) {
        await AccountService.getPostableAccount(tx, taxAccount.id);
      }

      for (const line of lines) {
        if (line.accountId) {
          await AccountService.getPostableAccount(tx, line.accountId);
        }
      }

      // Balanced JE: Dr AR total / Cr revenue per line / Cr tax.
      const jeLines: Array<{
        accountId: string;
        debit: string;
        credit: string;
        description: string | null;
      }> = [
        { accountId: arAccount.id, debit: totals.totalAmount, credit: '0.00', description: 'Invoice total' },
        ...lines.map((line) => ({
          accountId: line.accountId ?? arAccount.id,
          debit: '0.00',
          credit: line.lineTotal,
          description: line.description ?? `Line ${line.position}`,
        })),
      ];
      if (taxAccount) {
        jeLines.push({
          accountId: taxAccount.id,
          debit: '0.00',
          credit: totals.taxAmount,
          description: 'Sales tax',
        });
      }

      const journal = await JournalService.createPosted(
        {
          entryDate: invoice.issueDate,
          memo: `Invoice issued (${invoice.id})`,
          reference: invoice.id,
          sourceType: 'INVOICE',
          sourceId: invoice.id,
          lines: jeLines,
        },
        ctx,
        tx
      );

      const invoiceNumber = await NumberService.nextDocumentNumber(
        tx,
        'INV',
        yearOf(invoice.issueDate)
      );

      const [updated] = await tx
        .update(invoices)
        .set({
          status: 'ISSUED',
          invoiceNumber,
          journalEntryId: journal.entry.id,
          amountPaid: '0.00',
          balanceDue: totals.totalAmount,
          version: invoice.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(invoices.id, id), eq(invoices.status, 'DRAFT')))
        .returning();

      auditAccountingEvent({
        action: 'update',
        entityType: 'invoice',
        entityId: id,
        userId: ctx.userId,
        summary: { status: 'ISSUED', invoiceNumber, total: totals.totalAmount },
      });

      return { invoice: updated!, lines };
    };
    return exec ? write(exec) : runInFinancialTransaction(write);
  },

  /** DRAFT -> CANCELLED (only pre-issue; issued invoices need a reversing flow). */
  async cancel(id: string, ctx: ActorContext, exec?: AccountingTx): Promise<InvoiceRow> {
    const write = async (tx: AccountingTx): Promise<InvoiceRow> => {
      const invoice = await lockInvoiceRow(tx, id);
      requireInvoiceStatus(invoice, 'DRAFT', 'cancel');

      const [updated] = await tx
        .update(invoices)
        .set({ status: 'CANCELLED', version: invoice.version + 1, updatedAt: new Date() })
        .where(and(eq(invoices.id, id), eq(invoices.status, 'DRAFT')))
        .returning();

      auditAccountingEvent({
        action: 'update',
        entityType: 'invoice',
        entityId: id,
        userId: ctx.userId,
        summary: { status: 'CANCELLED' },
      });

      return updated!;
    };
    return exec ? write(exec) : runInFinancialTransaction(write);
  },

  async getById(id: string, exec?: AccountingExec): Promise<InvoiceWithLines> {
    const db = resolveExec(exec);
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) throw new AccountingNotFoundError('Invoice', id);
    return { invoice, lines: await loadInvoiceLines(db, id) };
  },

  /** Lists invoices newest-issue first with optional customer/status filters. OVERDUE is derived here. */
  async list(
    filters: { customerId?: string; status?: string } = {},
    exec?: AccountingExec
  ): Promise<InvoiceRow[]> {
    const db = resolveExec(exec);
    const conditions: SQL[] = [];
    if (filters.customerId) conditions.push(eq(invoices.customerId, filters.customerId));
    if (filters.status && filters.status !== 'OVERDUE') {
      conditions.push(eq(invoices.status, filters.status as InvoiceRow['status']));
    }

    const rows = await db
      .select()
      .from(invoices)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(invoices.issueDate), desc(invoices.createdAt));

    const today = new Date().toISOString().slice(0, 10);
    return rows.map((row) => {
      if (
        (row.status === 'ISSUED' || row.status === 'PARTIALLY_PAID') &&
        compareMoney(row.balanceDue, '0.00') > 0 &&
        row.dueDate < today
      ) {
        return { ...row, status: 'OVERDUE' as const };
      }
      return row;
    });
  },

  /**
   * Applies a payment allocation to an invoice, INSIDE the payment
   * transaction. Guards against over-payment and lost updates.
   */
  async applyPaymentAllocation(
    exec: AccountingTx,
    invoiceId: string,
    additionalPaid: string
  ): Promise<InvoiceRow> {
    const invoice = await lockInvoiceRow(exec, invoiceId);
    if (!(['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] as readonly string[]).includes(invoice.status)) {
      throw new AccountingValidationError(
        `Invoice ${invoice.invoiceNumber ?? invoice.id} (${invoice.status}) cannot receive payment`
      );
    }

    const amountPaid = addMoney(invoice.amountPaid, additionalPaid);
    const balanceDue = subtractMoney(invoice.totalAmount, amountPaid);
    if (compareMoney(balanceDue, '0.00') < 0) {
      throw new PaymentExceedsBalanceError(invoice.invoiceNumber ?? invoice.id);
    }

    const updated = await dbGuardUpdate(exec, invoiceId, {
      amountPaid,
      balanceDue,
      status: isMoneyZero(balanceDue) ? 'PAID' : 'PARTIALLY_PAID',
      oldVersion: invoice.version,
    });
    if (!updated) {
      throw new ConcurrentModificationError(invoice.invoiceNumber ?? invoice.id);
    }
    return updated;
  },
};

/** Guarded single-row update against the caller's observed version. */
async function dbGuardUpdate(
  exec: AccountingTx,
  invoiceId: string,
  patch: {
    amountPaid: string;
    balanceDue: string;
    status: 'PAID' | 'PARTIALLY_PAID';
    oldVersion: number;
  }
): Promise<InvoiceRow | undefined> {
  const [row] = await exec
    .update(invoices)
    .set({
      amountPaid: patch.amountPaid,
      balanceDue: patch.balanceDue,
      status: patch.status,
      version: patch.oldVersion + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.version, patch.oldVersion)))
    .returning();
  return row;
}
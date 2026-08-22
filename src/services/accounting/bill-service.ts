/**
 * Vendor bill lifecycle (spec §11).
 *
 *   DRAFT -> APPROVED -> POSTED -> PARTIALLY_PAID -> PAID   (+ CANCELLED)
 *
 * - Drafts carry no number; POST assigns BILL-YYYY-###### and posts a journal
 *   entry in the SAME transaction (spec §8):
 *       Dr <expense account(s)>      (subtotal, per line)
 *       Dr 2200 Tax Payable         (input tax, if any)
 *       Cr 2100 Accounts Payable    (total)
 * - After POST the bill is immutable except for payment application.
 * - CANCELLED is reachable only pre-post (DRAFT or APPROVED) - nothing
 *   financially has been recorded yet, so no reversing is needed.
 */
import { and, asc, desc, eq, gt, inArray, type SQL } from 'drizzle-orm';
import { runInFinancialTransaction, type AccountingTx } from '@/db/pg-client';
import {
  vendorBillLines,
  vendorBills,
  type VendorBillLineRow,
  type VendorBillRow,
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
import { TAX_PAYABLE_ACCOUNT_CODE } from './invoice-service';
import { resolveExec, type ActorContext, type AccountingExec } from './service-types';
import { auditAccountingEvent } from './audit-bridge';

/** Shared control account code from the seeded CoA (spec §29). */
export const AP_ACCOUNT_CODE = '2100';

/** A line a client supplies when creating/editing a bill draft. */
export interface BillLineInput {
  accountId: string;
  description?: string | null;
  quantity: number | string;
  unitPrice: string;
  taxRate?: number;
}

export interface CreateBillInput {
  vendorId: string;
  billDate: string;
  dueDate: string;
  notes?: string | null;
  lines: BillLineInput[];
}

export interface UpdateBillDraftInput {
  billDate?: string;
  dueDate?: string;
  notes?: string | null;
  lines?: BillLineInput[];
}

export interface BillTotals {
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
}

export interface BillWithLines {
  bill: VendorBillRow;
  lines: VendorBillLineRow[];
}

const BILLABLE_STATUSES = ['POSTED', 'PARTIALLY_PAID'] as const;

/** Computes lineTotal and per-line tax (tax-exclusive, half-up rounding). */
export function computeLineTotals(line: BillLineInput): {
  lineTotal: string;
  taxAmount: string;
} {
  const lineTotal = multiplyMoney(line.quantity, line.unitPrice);
  const taxRate = line.taxRate ?? 0;
  const taxAmount = taxRate > 0 ? percentOfMoney(lineTotal, taxRate) : '0.00';
  return { lineTotal, taxAmount };
}

/** Aggregates bill-wide subtotal / tax / total. */
export function computeBillTotals(lines: readonly BillLineInput[]): BillTotals {
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
export async function lockVendorBillRow(exec: AccountingTx, id: string): Promise<VendorBillRow> {
  const [row] = await exec
    .select()
    .from(vendorBills)
    .where(eq(vendorBills.id, id))
    .for('update');
  if (!row) throw new AccountingNotFoundError('Vendor bill', id);
  return row;
}

/** Loads a bill's lines ordered by position. */
export async function loadVendorBillLines(
  exec: AccountingExec,
  billId: string
): Promise<VendorBillLineRow[]> {
  return exec
    .select()
    .from(vendorBillLines)
    .where(eq(vendorBillLines.billId, billId))
    .orderBy(asc(vendorBillLines.position));
}

/** Open (payable) bills of a vendor, oldest due first (FIFO allocation). */
export async function listOpenBillsForVendor(
  exec: AccountingExec,
  vendorId: string
): Promise<VendorBillRow[]> {
  return exec
    .select()
    .from(vendorBills)
    .where(
      and(
        eq(vendorBills.vendorId, vendorId),
        inArray(vendorBills.status, [...BILLABLE_STATUSES]),
        gt(vendorBills.balanceDue, '0.00')
      )
    )
    .orderBy(asc(vendorBills.dueDate), asc(vendorBills.createdAt));
}

/** Single-step state gate with a friendly message. */
function requireBillStatus(
  bill: VendorBillRow,
  expected: VendorBillRow['status'],
  action: string
): void {
  if (bill.status !== expected) {
    throw new DocumentNotEditableError(
      bill.billNumber ?? `bill ${bill.id}`,
      `${bill.status} (${action} requires ${expected})`
    );
  }
}

/** Optimistic-lock gate (spec §25). */
function assertVersion(bill: VendorBillRow, expectedVersion: number | undefined): void {
  if (expectedVersion !== undefined && bill.version !== expectedVersion) {
    throw new ConcurrentModificationError(bill.billNumber ?? bill.id);
  }
}

function yearOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

export const BillService = {
  /**
   * Creates a DRAFT bill (no number, no accounting). Totals are always
   * computed SERVER-side from raw line inputs (spec §23) - never trusted
   * from the client.
   */
  async createDraft(
    input: CreateBillInput,
    ctx: ActorContext,
    exec?: AccountingTx
  ): Promise<BillWithLines> {
    const write = async (tx: AccountingTx): Promise<BillWithLines> => {
      const { subtotal, taxAmount, totalAmount } = computeBillTotals(input.lines);
      const currency = process.env.ACCOUNTING_BASE_CURRENCY ?? 'USD';

      const [bill] = await tx
        .insert(vendorBills)
        .values({
          vendorId: input.vendorId,
          billDate: input.billDate,
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
          billId: bill!.id,
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
      await tx.insert(vendorBillLines).values(lines);

      return { bill: bill!, lines: lines as unknown as VendorBillLineRow[] };
    };
    return exec ? write(exec) : runInFinancialTransaction(write);
  },

  /**
   * Rewrites a DRAFT's lines/dates/notes. Optimistic lock: pass the version
   * the caller last read or face ConcurrentModificationError.
   */
  async updateDraft(
    id: string,
    input: UpdateBillDraftInput,
    ctx: ActorContext,
    expectedVersion?: number,
    exec?: AccountingTx
  ): Promise<BillWithLines> {
    const write = async (tx: AccountingTx): Promise<BillWithLines> => {
      const bill = await lockVendorBillRow(tx, id);
      requireBillStatus(bill, 'DRAFT', 'edit');
      assertVersion(bill, expectedVersion);

      const lines = input.lines
        ? input.lines.map((line, index) => {
            const computed = computeLineTotals(line);
            return {
              billId: id,
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

      const totals = lines ? computeBillTotals(input.lines!) : null;

      if (lines) {
        await tx.delete(vendorBillLines).where(eq(vendorBillLines.billId, id));
        await tx.insert(vendorBillLines).values(lines);
      }

      const [updated] = await tx
        .update(vendorBills)
        .set({
          billDate: input.billDate ?? bill.billDate,
          dueDate: input.dueDate ?? bill.dueDate,
          notes: input.notes !== undefined ? input.notes : bill.notes,
          ...(totals
            ? {
                subtotal: totals.subtotal,
                taxAmount: totals.taxAmount,
                totalAmount: totals.totalAmount,
                balanceDue: totals.totalAmount,
              }
            : {}),
          version: bill.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(vendorBills.id, id), eq(vendorBills.version, bill.version)))
        .returning();

      return {
        bill: updated!,
        lines: lines ? (lines as unknown as VendorBillLineRow[]) : await loadVendorBillLines(tx, id),
      };
    };
    return exec ? write(exec) : runInFinancialTransaction(write);
  },

  /** DRAFT -> APPROVED (no financial effect yet; approval is a workflow gate). */
  async approve(id: string, ctx: ActorContext, exec?: AccountingTx): Promise<VendorBillRow> {
    const write = async (tx: AccountingTx): Promise<VendorBillRow> => {
      const bill = await lockVendorBillRow(tx, id);
      requireBillStatus(bill, 'DRAFT', 'approve');

      const [updated] = await tx
        .update(vendorBills)
        .set({ status: 'APPROVED', version: bill.version + 1, updatedAt: new Date() })
        .where(and(eq(vendorBills.id, id), eq(vendorBills.status, 'DRAFT')))
        .returning();

      auditAccountingEvent({
        action: 'update',
        entityType: 'vendor_bill',
        entityId: id,
        userId: ctx.userId,
        summary: { status: 'APPROVED' },
      });

      return updated!;
    };
    return exec ? write(exec) : runInFinancialTransaction(write);
  },

  /**
   * APPROVED -> POSTED. Books the accrual JE atomically with the status flip
   * in ONE transaction (spec §8): BILL number assigned now and never reused,
   * JE created POSTED via JournalService.createPosted. Idempotent callers pass
   * the key through the route wrapper (outside this method).
   */
  async post(id: string, ctx: ActorContext, exec?: AccountingTx): Promise<BillWithLines> {
    const write = async (tx: AccountingTx): Promise<BillWithLines> => {
      const bill = await lockVendorBillRow(tx, id);
      requireBillStatus(bill, 'APPROVED', 'post');
      const lines = await loadVendorBillLines(tx, id);
      if (lines.length === 0) {
        throw new AccountingValidationError('Cannot post a bill without lines');
      }

      const totals = computeBillTotals(
        lines.map((line) => ({
          accountId: line.accountId ?? '',
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: Number(line.taxRate),
        }))
      );
      if (compareMoney(totals.totalAmount, '0.00') <= 0) {
        throw new AccountingValidationError('Bill total must be greater than zero');
      }

      const apAccount = await AccountService.getAccountByCode(tx, AP_ACCOUNT_CODE);
      if (!apAccount) {
        throw new AccountingValidationError(
          `Control account ${AP_ACCOUNT_CODE} (Accounts Payable) is not configured - run seed:accounting`
        );
      }
      await AccountService.getPostableAccount(tx, apAccount.id);

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

      // Balanced JE: Dr expense per line / Dr input tax / Cr AP total.
      const jeLines: Array<{
        accountId: string;
        debit: string;
        credit: string;
        description: string | null;
      }> = [
        ...lines.map((line) => ({
          accountId: line.accountId ?? apAccount.id,
          debit: line.lineTotal,
          credit: '0.00',
          description: line.description ?? `Line ${line.position}`,
        })),
      ];
      if (taxAccount) {
        jeLines.push({
          accountId: taxAccount.id,
          debit: totals.taxAmount,
          credit: '0.00',
          description: 'Purchase tax',
        });
      }
      jeLines.push({
        accountId: apAccount.id,
        debit: '0.00',
        credit: totals.totalAmount,
        description: 'Vendor bill total',
      });

      const journal = await JournalService.createPosted(
        {
          entryDate: bill.billDate,
          memo: `Vendor bill posted (${bill.id})`,
          reference: bill.id,
          sourceType: 'VENDOR_BILL',
          sourceId: bill.id,
          lines: jeLines,
        },
        ctx,
        tx
      );

      const billNumber = await NumberService.nextDocumentNumber(
        tx,
        'BILL',
        yearOf(bill.billDate)
      );

      const [updated] = await tx
        .update(vendorBills)
        .set({
          status: 'POSTED',
          billNumber,
          journalEntryId: journal.entry.id,
          amountPaid: '0.00',
          balanceDue: totals.totalAmount,
          version: bill.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(vendorBills.id, id), eq(vendorBills.status, 'APPROVED')))
        .returning();

      auditAccountingEvent({
        action: 'update',
        entityType: 'vendor_bill',
        entityId: id,
        userId: ctx.userId,
        summary: { status: 'POSTED', billNumber, total: totals.totalAmount },
      });

      return { bill: updated!, lines };
    };
    return exec ? write(exec) : runInFinancialTransaction(write);
  },

  /** DRAFT/APPROVED -> CANCELLED (pre-post only; posted bills need a reversing flow). */
  async cancel(id: string, ctx: ActorContext, exec?: AccountingTx): Promise<VendorBillRow> {
    const write = async (tx: AccountingTx): Promise<VendorBillRow> => {
      const bill = await lockVendorBillRow(tx, id);
      if (bill.status !== 'DRAFT' && bill.status !== 'APPROVED') {
        throw new DocumentNotEditableError(
          bill.billNumber ?? `bill ${bill.id}`,
          `${bill.status} (cancel requires DRAFT or APPROVED)`
        );
      }

      const [updated] = await tx
        .update(vendorBills)
        .set({ status: 'CANCELLED', version: bill.version + 1, updatedAt: new Date() })
        .where(and(eq(vendorBills.id, id), eq(vendorBills.status, bill.status)))
        .returning();

      auditAccountingEvent({
        action: 'update',
        entityType: 'vendor_bill',
        entityId: id,
        userId: ctx.userId,
        summary: { status: 'CANCELLED' },
      });

      return updated!;
    };
    return exec ? write(exec) : runInFinancialTransaction(write);
  },

  async getById(id: string, exec?: AccountingExec): Promise<BillWithLines> {
    const db = resolveExec(exec);
    const [bill] = await db.select().from(vendorBills).where(eq(vendorBills.id, id));
    if (!bill) throw new AccountingNotFoundError('Vendor bill', id);
    return { bill, lines: await loadVendorBillLines(db, id) };
  },

  /** Lists bills newest-first with optional vendor/status filters. */
  async list(
    filters: { vendorId?: string; status?: string } = {},
    exec?: AccountingExec
  ): Promise<VendorBillRow[]> {
    const db = resolveExec(exec);
    const conditions: SQL[] = [];
    if (filters.vendorId) conditions.push(eq(vendorBills.vendorId, filters.vendorId));
    if (filters.status) {
      conditions.push(eq(vendorBills.status, filters.status as VendorBillRow['status']));
    }

    return db
      .select()
      .from(vendorBills)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(vendorBills.billDate), desc(vendorBills.createdAt));
  },

  /**
   * Applies a payment allocation to a bill, INSIDE the payment transaction.
   * Guards against over-payment and lost updates.
   */
  async applyPaymentAllocation(
    exec: AccountingTx,
    billId: string,
    additionalPaid: string
  ): Promise<VendorBillRow> {
    const bill = await lockVendorBillRow(exec, billId);
    if (!(BILLABLE_STATUSES as readonly string[]).includes(bill.status)) {
      throw new AccountingValidationError(
        `Bill ${bill.billNumber ?? bill.id} (${bill.status}) cannot receive payment`
      );
    }

    const amountPaid = addMoney(bill.amountPaid, additionalPaid);
    const balanceDue = subtractMoney(bill.totalAmount, amountPaid);
    if (compareMoney(balanceDue, '0.00') < 0) {
      throw new PaymentExceedsBalanceError(bill.billNumber ?? bill.id);
    }

    const updated = await dbGuardUpdate(exec, billId, {
      amountPaid,
      balanceDue,
      status: isMoneyZero(balanceDue) ? 'PAID' : 'PARTIALLY_PAID',
      oldVersion: bill.version,
    });
    if (!updated) {
      throw new ConcurrentModificationError(bill.billNumber ?? bill.id);
    }
    return updated;
  },
};

/** Guarded single-row update against the caller's observed version. */
async function dbGuardUpdate(
  exec: AccountingTx,
  billId: string,
  patch: {
    amountPaid: string;
    balanceDue: string;
    status: 'PAID' | 'PARTIALLY_PAID';
    oldVersion: number;
  }
): Promise<VendorBillRow | undefined> {
  const [row] = await exec
    .update(vendorBills)
    .set({
      amountPaid: patch.amountPaid,
      balanceDue: patch.balanceDue,
      status: patch.status,
      version: patch.oldVersion + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(vendorBills.id, billId), eq(vendorBills.version, patch.oldVersion)))
    .returning();
  return row;
}


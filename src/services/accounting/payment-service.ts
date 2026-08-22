/**
 * Customer payment lifecycle (spec §12).
 *
 *   recordCustomerPayment
 *     ├── insert payment             (PAY-YYYY-######)
 *     ├── insert allocation row(s)
 *     ├── post journal entry:        Dr <cash account> / Cr 1200 AR (amount)
 *     └── update invoice balances/status
 *
 * All of the above commit together (spec §8). Enforced rules:
 * - sum(allocations) <= payment amount (PAYMENT_ALLOCATION_EXCEEDS_AMOUNT)
 * - per-allocation amount <= invoice balanceDue (PAYMENT_EXCEEDS_BALANCE)
 * - when allocations are omitted, invoices are consumed FIFO by due date.
 */
import { desc, eq } from 'drizzle-orm';
import { runInFinancialTransaction, type AccountingTx } from '@/db/pg-client';
import {
  paymentAllocations,
  payments,
  type PaymentAllocationRow,
  type PaymentRow,
} from '@/db/schema/accounting';
import {
  AccountingNotFoundError,
  AccountingValidationError,
  PaymentAllocationExceedsAmountError,
  PaymentExceedsBalanceError,
} from '@/utils/accounting-errors';
import { addMoney, compareMoney, parseMoney, subtractMoney } from '@/utils/money';
import { AccountService } from './account-service';
import {
  AR_ACCOUNT_CODE,
  InvoiceService,
  listOpenInvoicesForCustomer,
  lockInvoiceRow,
} from './invoice-service';
import { JournalService } from './journal-service';
import { NumberService } from './number-service';
import { resolveExec, type ActorContext, type AccountingExec } from './service-types';
import { auditAccountingEvent } from './audit-bridge';

export interface PaymentAllocationInput {
  invoiceId: string;
  amount: string;
}

export interface RecordCustomerPaymentInput {
  customerId: string;
  paymentDate: string;
  amount: string;
  cashAccountId: string;
  reference?: string | null;
  allocations?: PaymentAllocationInput[];
}

export interface AllocationRow {
  invoiceId: string;
  amount: string;
}

export interface RecordPaymentResult {
  payment: PaymentRow;
  allocations: AllocationRow[];
  journal: Record<string, unknown>;
}

const BILLABLE_STATUSES = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] as const;

/** Validates explicitly-supplied allocations against invoices + the amount. */
async function resolveExplicitAllocations(
  exec: AccountingTx,
  customerId: string,
  allocations: readonly PaymentAllocationInput[],
  amount: string
): Promise<AllocationRow[]> {
  const total = allocations.reduce<string>((sum, a) => addMoney(sum, a.amount), '0.00');
  if (compareMoney(total, amount) > 0) {
    throw new PaymentAllocationExceedsAmountError();
  }

  const out: AllocationRow[] = [];
  for (const allocation of allocations) {
    const invoice = await lockInvoiceRow(exec, allocation.invoiceId);
    if (invoice.customerId !== customerId) {
      throw new AccountingValidationError(
        'An allocation references an invoice belonging to another customer'
      );
    }
    if (!(BILLABLE_STATUSES as readonly string[]).includes(invoice.status)) {
      throw new AccountingValidationError(
        `Invoice ${invoice.invoiceNumber ?? invoice.id} (${invoice.status}) cannot receive payment`
      );
    }
    const parsed = parseMoney(allocation.amount);
    if (compareMoney(invoice.balanceDue, parsed) < 0) {
      throw new PaymentExceedsBalanceError(invoice.invoiceNumber ?? invoice.id);
    }
    out.push({ invoiceId: invoice.id, amount: parsed });
  }
  return out;
}

/** Auto-allocates the payment FIFO across open invoices (oldest due first). */
async function resolveFifoAllocations(
  exec: AccountingTx,
  customerId: string,
  amount: string
): Promise<AllocationRow[]> {
  const open = await listOpenInvoicesForCustomer(exec, customerId);
  const out: AllocationRow[] = [];
  let remaining = amount;
  for (const invoice of open) {
    if (compareMoney(remaining, '0.00') <= 0) break;
    const allocation = compareMoney(invoice.balanceDue, remaining) <= 0
      ? invoice.balanceDue
      : remaining;
    out.push({ invoiceId: invoice.id, amount: allocation });
    remaining = subtractMoney(remaining, allocation);
  }
  return out;
}

export const PaymentService = {
  /**
   * Records a customer payment with optional allocations and books the cash
   * journal entry atomically (spec §12, §8). Idempotent callers pass the key
   * through the route wrapper, outside this method.
   */
  async recordCustomerPayment(
    input: RecordCustomerPaymentInput,
    ctx: ActorContext,
    exec?: AccountingTx
  ): Promise<RecordPaymentResult> {
    const write = async (tx: AccountingTx): Promise<RecordPaymentResult> => {
      const amount = parseMoney(input.amount);

      const cashAccount = await AccountService.getPostableAccount(tx, input.cashAccountId);
      const arAccount = await AccountService.getAccountByCode(tx, AR_ACCOUNT_CODE);
      if (!arAccount) {
        throw new AccountingValidationError(
          `Control account ${AR_ACCOUNT_CODE} (Accounts Receivable) is not configured - run seed:accounting`
        );
      }
      await AccountService.getPostableAccount(tx, arAccount.id);

      const allocations =
        input.allocations && input.allocations.length > 0
          ? await resolveExplicitAllocations(tx, input.customerId, input.allocations, amount)
          : await resolveFifoAllocations(tx, input.customerId, amount);
      if (allocations.length === 0) {
        throw new AccountingValidationError(
          'Payment could not be allocated - the customer has no outstanding invoices'
        );
      }

      const year = new Date(`${input.paymentDate}T00:00:00Z`).getUTCFullYear();
      const paymentNumber = await NumberService.nextDocumentNumber(tx, 'PAY', year);

      const [payment] = await tx
        .insert(payments)
        .values({
          paymentNumber,
          paymentType: 'CUSTOMER',
          customerId: input.customerId,
          paymentDate: input.paymentDate,
          currency: process.env.ACCOUNTING_BASE_CURRENCY ?? 'USD',
          amount,
          cashAccountId: input.cashAccountId,
          reference: input.reference ?? null,
          createdBy: ctx.userId,
          createdByName: ctx.userName,
        })
        .returning();

      await tx
        .insert(paymentAllocations)
        .values(
          allocations.map((allocation) => ({
            paymentId: payment!.id,
            invoiceId: allocation.invoiceId,
            allocatedAmount: allocation.amount,
          }))
        );

      const journal = await JournalService.createPosted(
        {
          entryDate: input.paymentDate,
          memo: `Customer payment ${paymentNumber}`,
          reference: input.reference ?? null,
          sourceType: 'CUSTOMER_PAYMENT',
          sourceId: payment!.id,
          lines: [
            { accountId: cashAccount.id, debit: amount, credit: '0.00', description: 'Cash received' },
            {
              accountId: arAccount.id,
              debit: '0.00',
              credit: amount,
              description: 'Accounts receivable applied',
            },
          ],
        },
        ctx,
        tx
      );

      for (const allocation of allocations) {
        await InvoiceService.applyPaymentAllocation(tx, allocation.invoiceId, allocation.amount);
      }

      auditAccountingEvent({
        action: 'create',
        entityType: 'payment',
        entityId: payment!.id,
        userId: ctx.userId,
        summary: { paymentNumber, amount },
      });

      return { payment: payment!, allocations, journal: { id: journal.entry.id } };
    };
    return exec ? write(exec) : runInFinancialTransaction(write);
  },

  /** Lists payments newest-first. */
  async listPayments(exec?: AccountingExec): Promise<PaymentRow[]> {
    return resolveExec(exec)
      .select()
      .from(payments)
      .orderBy(desc(payments.paymentDate), desc(payments.createdAt));
  },

  /** Fetches a payment with its allocation rows. */
  async getById(
    paymentId: string,
    exec?: AccountingExec
  ): Promise<{ payment: PaymentRow; allocations: PaymentAllocationRow[] }> {
    const db = resolveExec(exec);
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
    if (!payment) throw new AccountingNotFoundError('Payment', paymentId);
    const allocations = await db
      .select()
      .from(paymentAllocations)
      .where(eq(paymentAllocations.paymentId, paymentId));
    return { payment, allocations };
  },
};
/**
 * Part 3 AR tests (spec §11, §12) - pure unit tests, PostgreSQL never
 * contacted. The Drizzle tx handle is a chain-recording stub; sibling
 * services are jest.mock'ed. The invoice/payment services pass the caller's
 * `tx` into JournalService.createPosted, so the REAL posting path is also
 * exercised: header + Dr/Cr lines must balance with correct source linkage.
 */
import { JournalService } from '@/services/accounting/journal-service';
import { InvoiceService, computeInvoiceTotals } from '@/services/accounting/invoice-service';
import { PaymentService } from '@/services/accounting/payment-service';
import { AccountService } from '@/services/accounting/account-service';
import { NumberService } from '@/services/accounting/number-service';
import { PeriodService } from '@/services/accounting/period-service';
import {
  PaymentAllocationExceedsAmountError,
  PaymentExceedsBalanceError,
  UnbalancedEntryError,
} from '@/utils/accounting-errors';
import type { ActorContext } from '@/services/accounting/service-types';
import type { JournalEntryRow } from '@/db/schema/accounting';
import type { AccountingTx } from '@/db/pg-client';

jest.mock('@/db/pg-client', () => ({
  runInFinancialTransaction: jest.fn(),
  getAccountingDb: jest.fn(),
  getAccountingClient: jest.fn(),
  closeAccountingPool: jest.fn(),
}));

jest.mock('@/services/accounting/number-service', () => ({
  NumberService: { nextDocumentNumber: jest.fn() },
}));

jest.mock('@/services/accounting/period-service', () => ({
  PeriodService: { getOpenPeriodFor: jest.fn() },
}));

jest.mock('@/services/accounting/account-service', () => ({
  AccountService: { getPostableAccount: jest.fn(), getAccountByCode: jest.fn() },
}));

jest.mock('@/services/accounting/audit-bridge', () => ({
  auditAccountingEvent: jest.fn(),
}));

type Row = Record<string, unknown>;

/** Chain-recording Drizzle query stub (same shape as the journal suite). */
interface QueryStub {
  select: jest.Mock;
  from: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  for: jest.Mock;
  values: jest.Mock;
  set: jest.Mock;
  returning: jest.Mock;
}

function queryStub(result: Row[]): QueryStub {
  const pending: Promise<Row[]> = Promise.resolve(result);
  const stub: QueryStub = {
    select: jest.fn(() => stub),
    from: jest.fn(() => stub),
    where: jest.fn(() => stub),
    orderBy: jest.fn(() => pending),
    for: jest.fn(() => pending),
    values: jest.fn(() => stub),
    set: jest.fn(() => stub),
    returning: jest.fn(() => pending),
  };
  return stub;
}

interface TxStub {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
}

/** FIFO-queued tx: each select/insert/update consumes the next configured result. */
function makeTx(): {
  tx: TxStub & AccountingTx;
  selectResults: Row[][];
  insertResults: Row[][];
  updateResults: Row[][];
} {
  const selectResults: Row[][] = [];
  const insertResults: Row[][] = [];
  const updateResults: Row[][] = [];
  const tx: TxStub = {
    select: jest.fn(() => queryStub(selectResults.shift() ?? [])),
    insert: jest.fn(() => queryStub(insertResults.shift() ?? [])),
    update: jest.fn(() => queryStub(updateResults.shift() ?? [])),
    delete: jest.fn(() => queryStub([])),
  };
  return { tx: tx as unknown as TxStub & AccountingTx, selectResults, insertResults, updateResults };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CTX: ActorContext = { userId: null, userName: null };
const INVOICE_ID = '11111111-1111-4111-8111-111111111111';
const CUSTOMER_ID = '22222222-2222-4222-8222-222222222222';
const AR_ACCOUNT_ID = '33333333-3333-4333-8333-333333333333';
const REVENUE_ACCOUNT_ID = '44444444-4444-4444-8444-444444444444';
const TAX_ACCOUNT_ID = '55555555-5555-4555-8555-555555555555';
const CASH_ACCOUNT_ID = '66666666-6666-4666-8666-666666666666';
const PERIOD_ID = '77777777-7777-4777-8777-777777777777';

function accountRow(overrides: Record<string, unknown> = {}): Row {
  return {
    id: AR_ACCOUNT_ID,
    code: '1200',
    name: 'Accounts Receivable',
    type: 'Asset',
    isActive: true,
    isPostable: true,
    ...overrides,
  };
}

function invoiceRow(overrides: Record<string, unknown> = {}): Row {
  return {
    id: INVOICE_ID,
    invoiceNumber: null,
    customerId: CUSTOMER_ID,
    issueDate: '2026-05-15',
    dueDate: '2026-06-15',
    currency: 'USD',
    subtotal: '100.00',
    taxAmount: '15.00',
    totalAmount: '115.00',
    amountPaid: '0.00',
    balanceDue: '115.00',
    status: 'DRAFT',
    journalEntryId: null,
    version: 1,
    ...overrides,
  };
}

function invoiceLineRow(overrides: Record<string, unknown> = {}): Row {
  return {
    id: '99999999-9999-4999-9999-999999999999',
    invoiceId: INVOICE_ID,
    position: 1,
    description: 'Consulting',
        quantity: '2',
    unitPrice: '50.00',
    taxRate: '15.00',
    taxAmount: '15.00',
    lineTotal: '100.00',
    accountId: REVENUE_ACCOUNT_ID,
    ...overrides,
  };
}

beforeEach(() => {
  // resetAllMocks (not clearAllMocks): clears mockResolvedValueOnce queues
  // left over from previous tests that would otherwise leak across tests.
  jest.resetAllMocks();
    (AccountService.getPostableAccount as jest.Mock).mockImplementation(
    async (_exec: unknown, accountId: string) =>
      accountId === CASH_ACCOUNT_ID
        ? accountRow({ id: CASH_ACCOUNT_ID })
        : accountRow({ id: AR_ACCOUNT_ID })
  );
  (AccountService.getAccountByCode as jest.Mock).mockImplementation(
    async (_exec: unknown, code: string) =>
      code === '1200' ? accountRow({ id: AR_ACCOUNT_ID }) : null
  );
  (PeriodService.getOpenPeriodFor as jest.Mock).mockResolvedValue({
    id: PERIOD_ID,
    name: 'May 2026',
    status: 'OPEN',
  });
  (NumberService.nextDocumentNumber as jest.Mock).mockResolvedValue('JE-2026-000001');
});

// ---------------------------------------------------------------------------
// computeInvoiceTotals (pure)
// ---------------------------------------------------------------------------

describe('computeInvoiceTotals', () => {
  it('computes tax-exclusive totals with half-up rounding', () => {
    const totals = computeInvoiceTotals([
      { accountId: REVENUE_ACCOUNT_ID, quantity: 2, unitPrice: '50.00', taxRate: 15 },
    ]);
    expect(totals).toEqual({ subtotal: '100.00', taxAmount: '15.00', totalAmount: '115.00' });
  });

  it('computes zero tax when no taxRate is supplied', () => {
    const totals = computeInvoiceTotals([
      { accountId: REVENUE_ACCOUNT_ID, quantity: 3, unitPrice: '10.00' },
    ]);
    expect(totals).toEqual({ subtotal: '30.00', taxAmount: '0.00', totalAmount: '30.00' });
  });

  it('sums multiple lines', () => {
    const totals = computeInvoiceTotals([
      { accountId: REVENUE_ACCOUNT_ID, quantity: 1, unitPrice: '100.00' },
      { accountId: REVENUE_ACCOUNT_ID, quantity: 2, unitPrice: '25.25' },
    ]);
    expect(totals.subtotal).toBe('150.50');
    expect(totals.totalAmount).toBe('150.50');
  });
});

// ---------------------------------------------------------------------------
// JournalService.createPosted (shared posting path used by all AR flows)
// ---------------------------------------------------------------------------

describe('JournalService.createPosted', () => {
  it('creates a balanced POSTED entry with source linkage', async () => {
    const { tx, insertResults } = makeTx();
    insertResults.push([{ id: 'je-row-1', entryNumber: 'JE-2026-000042', status: 'POSTED' }]);
    insertResults.push([]);

    (NumberService.nextDocumentNumber as jest.Mock).mockResolvedValue('JE-2026-000042');

    const result = await JournalService.createPosted(
      {
        entryDate: '2026-05-15',
        memo: 'Invoice issued',
        sourceType: 'INVOICE',
        sourceId: INVOICE_ID,
        lines: [
          { accountId: AR_ACCOUNT_ID, debit: '115.00', credit: '0.00' },
          { accountId: REVENUE_ACCOUNT_ID, debit: '0.00', credit: '100.00' },
          { accountId: TAX_ACCOUNT_ID, debit: '0.00', credit: '15.00' },
        ],
      },
      CTX,
      tx
    );

    expect(result.entry.status).toBe('POSTED');

    const headers = (tx.insert as jest.Mock).mock.results;
    const headerValues = headers[0].value.values.mock.calls[0][0];
    expect(headerValues).toMatchObject({
      sourceType: 'INVOICE',
      sourceId: INVOICE_ID,
      status: 'POSTED',
      totalDebit: '115.00',
      totalCredit: '115.00',
      accountingPeriodId: PERIOD_ID,
    });

    const postings = headers[1].value.values.mock.calls[0][0];
    expect(postings).toHaveLength(3);
    expect(postings[0]).toMatchObject({ accountId: AR_ACCOUNT_ID, debit: '115.00', credit: '0.00', lineNumber: 1 });
    expect(postings[1]).toMatchObject({ accountId: REVENUE_ACCOUNT_ID, debit: '0.00', credit: '100.00' });
    expect(postings[2]).toMatchObject({ accountId: TAX_ACCOUNT_ID, debit: '0.00', credit: '15.00' });
    expect(postings[1].journalEntryId).toBe('je-row-1');
  });

  it('rejects an unbalanced entry before writing', async () => {
    const { tx } = makeTx();
    await expect(
      JournalService.createPosted(
        {
          entryDate: '2026-05-15',
          sourceType: 'MANUAL',
          sourceId: '1',
          lines: [
            { accountId: AR_ACCOUNT_ID, debit: '100.00', credit: '0.00' },
            { accountId: REVENUE_ACCOUNT_ID, debit: '0.00', credit: '90.00' },
          ],
        },
        CTX,
        tx
      )
    ).rejects.toBeInstanceOf(UnbalancedEntryError);
  });

  it('propagates a non-postable-account rejection and writes nothing', async () => {
    (AccountService.getPostableAccount as jest.Mock).mockRejectedValue(
      new Error('ACCOUNT_NOT_POSTABLE')
    );
    const { tx } = makeTx();

    await expect(
      JournalService.createPosted(
        {
          entryDate: '2026-05-15',
          sourceType: 'MANUAL',
          sourceId: '1',
          lines: [
            { accountId: AR_ACCOUNT_ID, debit: '10.00', credit: '0.00' },
            { accountId: REVENUE_ACCOUNT_ID, debit: '0.00', credit: '10.00' },
          ],
        },
        CTX,
        tx
      )
    ).rejects.toThrow('ACCOUNT_NOT_POSTABLE');
    expect((tx.insert as jest.Mock).mock.calls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// InvoiceService
// ---------------------------------------------------------------------------

describe('InvoiceService', () => {
  it('createDraft persists an invoice + lines with server-computed totals', async () => {
    const { tx, insertResults } = makeTx();
    insertResults.push([invoiceRow()]);
    insertResults.push([]);

    const result = await InvoiceService.createDraft(
      {
        customerId: CUSTOMER_ID,
        issueDate: '2026-05-15',
        dueDate: '2026-06-15',
        notes: null,
        lines: [
          { accountId: REVENUE_ACCOUNT_ID, description: 'Consulting', quantity: 2, unitPrice: '50.00', taxRate: 15 },
        ],
      },
      CTX,
      tx
    );

    expect(result.invoice.status).toBe('DRAFT');
    const headerValues = (tx.insert as jest.Mock).mock.results[0].value.values.mock.calls[0][0];
    expect(headerValues).toMatchObject({
      status: 'DRAFT',
      subtotal: '100.00',
      taxAmount: '15.00',
      totalAmount: '115.00',
      balanceDue: '115.00',
    });
    const linesInsert = (tx.insert as jest.Mock).mock.results[1].value.values.mock.calls[0][0];
    expect(linesInsert).toHaveLength(1);
    expect(linesInsert[0]).toMatchObject({ position: 1, lineTotal: '100.00', taxAmount: '15.00' });
  });

  it('issue posts Dr AR / Cr revenue / Cr tax and flips to ISSUED', async () => {
    const { tx, selectResults, insertResults, updateResults } = makeTx();
    selectResults.push([invoiceRow()]); // lock
    selectResults.push([invoiceLineRow()]); // lines
    (AccountService.getAccountByCode as jest.Mock).mockImplementation(
      async (_exec: unknown, code: string) =>
        code === '1200'
          ? accountRow({ id: AR_ACCOUNT_ID, code: '1200' })
          : code === '2200'
            ? accountRow({ id: TAX_ACCOUNT_ID, code: '2200' })
            : null
    );
    (NumberService.nextDocumentNumber as jest.Mock)
      .mockResolvedValueOnce('JE-2026-000045')
      .mockResolvedValueOnce('INV-2026-000001');
    insertResults.push([{ id: 'je-9', entryNumber: 'JE-2026-000045', status: 'POSTED' }]);
    insertResults.push([]);
    updateResults.push([
      invoiceRow({ status: 'ISSUED', invoiceNumber: 'INV-2026-000001', journalEntryId: 'je-9', version: 2 }),
    ]);

    await InvoiceService.issue(INVOICE_ID, CTX, tx);

    // Balanced accrual JE: Dr AR 115 / Cr revenue 100 / Cr tax 15.
    const inserts = (tx.insert as jest.Mock).mock.results;
    expect(inserts[0].value.values.mock.calls[0][0]).toMatchObject({
      sourceType: 'INVOICE',
      sourceId: INVOICE_ID,
      status: 'POSTED',
      totalDebit: '115.00',
      totalCredit: '115.00',
    });
    const postings = inserts[1].value.values.mock.calls[0][0];
    expect(postings).toHaveLength(3);
    expect(postings[0]).toMatchObject({ accountId: AR_ACCOUNT_ID, debit: '115.00', credit: '0.00' });
    expect(postings[1]).toMatchObject({ accountId: REVENUE_ACCOUNT_ID, debit: '0.00', credit: '100.00' });
    expect(postings[2]).toMatchObject({ accountId: TAX_ACCOUNT_ID, debit: '0.00', credit: '15.00' });

    const setPayload = (tx.update as jest.Mock).mock.results[0].value.set.mock.calls[0][0];
    expect(setPayload).toMatchObject({
      status: 'ISSUED',
      invoiceNumber: 'INV-2026-000001',
      journalEntryId: 'je-9',
      balanceDue: '115.00',
      version: 2,
    });
  });

  it('issue rejects an already-issued invoice', async () => {
    const { tx, selectResults } = makeTx();
    selectResults.push([invoiceRow({ status: 'ISSUED', invoiceNumber: 'INV-2026-000001' })]);

    await expect(InvoiceService.issue(INVOICE_ID, CTX, tx)).rejects.toThrow('ISSUED');
  });

  it('issue rejects when the AR control account is missing', async () => {
    const { tx, selectResults } = makeTx();
    selectResults.push([invoiceRow()]);
    selectResults.push([invoiceLineRow()]);
    (AccountService.getAccountByCode as jest.Mock).mockResolvedValue(null);

    await expect(InvoiceService.issue(INVOICE_ID, CTX, tx)).rejects.toThrow(
      'Accounts Receivable'
    );
    expect((tx.insert as jest.Mock).mock.calls).toHaveLength(0);
  });

  it('cancel flips DRAFT -> CANCELLED', async () => {
    const { tx, selectResults, updateResults } = makeTx();
    selectResults.push([invoiceRow()]);
    updateResults.push([invoiceRow({ status: 'CANCELLED', version: 2 })]);

    await InvoiceService.cancel(INVOICE_ID, CTX, tx);
    const setPayload = (tx.update as jest.Mock).mock.results[0].value.set.mock.calls[0][0];
    expect(setPayload).toMatchObject({ status: 'CANCELLED', version: 2 });
  });

  it('cancel rejects an issued invoice', async () => {
    const { tx, selectResults } = makeTx();
    selectResults.push([invoiceRow({ status: 'ISSUED', invoiceNumber: 'INV-2026-000001' })]);

    await expect(InvoiceService.cancel(INVOICE_ID, CTX, tx)).rejects.toThrow('ISSUED');
  });
});

// ---------------------------------------------------------------------------
// PaymentService
// ---------------------------------------------------------------------------

const PAYMENT_ID = '88888888-8888-4888-8888-888888888888';

function paymentRow(overrides: Record<string, unknown> = {}): Row {
  return {
    id: PAYMENT_ID,
    paymentNumber: 'PAY-2026-000001',
    paymentType: 'CUSTOMER',
    customerId: CUSTOMER_ID,
    paymentDate: '2026-06-01',
    currency: 'USD',
    amount: '115.00',
    cashAccountId: CASH_ACCOUNT_ID,
    reference: null,
    status: 'COMPLETED',
    ...overrides,
  };
}

describe('PaymentService', () => {
  it('records a payment with allocation and posts Dr Cash / Cr AR', async () => {
    const { tx, selectResults, insertResults, updateResults } = makeTx();
    selectResults.push([invoiceRow({ status: 'ISSUED' })]);
    selectResults.push([invoiceRow({ status: 'ISSUED' })]);

    (NumberService.nextDocumentNumber as jest.Mock)
      .mockResolvedValueOnce('PAY-2026-000001')
      .mockResolvedValueOnce('JE-2026-000999');
    insertResults.push([paymentRow()]);
    insertResults.push([]);
    insertResults.push([{ id: 'je-p', entryNumber: 'JE-2026-000999', status: 'POSTED' }]);
    insertResults.push([]);
    updateResults.push([invoiceRow({ status: 'PAID', amountPaid: '115.00', balanceDue: '0.00', version: 2 })]);

    const result = await PaymentService.recordCustomerPayment(
      {
        customerId: CUSTOMER_ID,
        paymentDate: '2026-06-01',
        amount: '115.00',
        cashAccountId: CASH_ACCOUNT_ID,
        allocations: [{ invoiceId: INVOICE_ID, amount: '115.00' }],
      },
      CTX,
      tx
    );

    const inserts = (tx.insert as jest.Mock).mock.results;
    expect(inserts[0].value.values.mock.calls[0][0]).toMatchObject({
      paymentNumber: 'PAY-2026-000001',
      paymentType: 'CUSTOMER',
      amount: '115.00',
    });
    expect(inserts[1].value.values.mock.calls[0][0]).toEqual([
      { paymentId: PAYMENT_ID, invoiceId: INVOICE_ID, allocatedAmount: '115.00' },
    ]);
    expect(inserts[2].value.values.mock.calls[0][0]).toMatchObject({
      sourceType: 'CUSTOMER_PAYMENT',
      sourceId: PAYMENT_ID,
      status: 'POSTED',
      totalDebit: '115.00',
      totalCredit: '115.00',
    });
    const postings = inserts[3].value.values.mock.calls[0][0];
    expect(postings).toHaveLength(2);
    expect(postings[0]).toMatchObject({ accountId: CASH_ACCOUNT_ID, debit: '115.00', credit: '0.00' });
    expect(postings[1]).toMatchObject({ accountId: AR_ACCOUNT_ID, debit: '0.00', credit: '115.00' });

    const setPayload = (tx.update as jest.Mock).mock.results[0].value.set.mock.calls[0][0];
    expect(setPayload).toMatchObject({ status: 'PAID', amountPaid: '115.00', balanceDue: '0.00' });
    expect(result.allocations).toEqual([{ invoiceId: INVOICE_ID, amount: '115.00' }]);
  });

  it('rejects an allocation exceeding the invoice balance', async () => {
    const { tx, selectResults } = makeTx();
    selectResults.push([invoiceRow({ status: 'ISSUED', balanceDue: '100.00' })]);

    await expect(
      PaymentService.recordCustomerPayment(
        {
          customerId: CUSTOMER_ID,
          paymentDate: '2026-06-01',
          amount: '115.00',
          cashAccountId: CASH_ACCOUNT_ID,
          allocations: [{ invoiceId: INVOICE_ID, amount: '115.00' }],
        },
        CTX,
        tx
      )
    ).rejects.toBeInstanceOf(PaymentExceedsBalanceError);
  });

  it('rejects allocations summing above the payment amount', async () => {
    const { tx } = makeTx();
    await expect(
      PaymentService.recordCustomerPayment(
        {
          customerId: CUSTOMER_ID,
          paymentDate: '2026-06-01',
          amount: '100.00',
          cashAccountId: CASH_ACCOUNT_ID,
          allocations: [
            { invoiceId: INVOICE_ID, amount: '60.00' },
            { invoiceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', amount: '60.00' },
          ],
        },
        CTX,
        tx
      )
    ).rejects.toBeInstanceOf(PaymentAllocationExceedsAmountError);
  });

  it('auto-allocates FIFO across two invoices (spec §12.2)', async () => {
    const INV_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const INV_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const { tx, selectResults, insertResults, updateResults } = makeTx();
    selectResults.push([
      invoiceRow({ id: INV_A, balanceDue: '1000.00', totalAmount: '1000.00', status: 'ISSUED' }),
      invoiceRow({ id: INV_B, balanceDue: '2000.00', totalAmount: '2000.00', status: 'ISSUED' }),
    ]);
            selectResults.push([invoiceRow({ id: INV_A, status: 'ISSUED', totalAmount: '1000.00', amountPaid: '0.00' })]);
    selectResults.push([invoiceRow({ id: INV_B, status: 'ISSUED', totalAmount: '2000.00', amountPaid: '0.00' })]);

    (NumberService.nextDocumentNumber as jest.Mock)
      .mockResolvedValueOnce('PAY-2026-000002')
      .mockResolvedValueOnce('JE-2026-001000');
    insertResults.push([paymentRow({ paymentNumber: 'PAY-2026-000002', amount: '2500.00' })]);
    insertResults.push([]);
    insertResults.push([{ id: 'je-2', entryNumber: 'JE-2026-001000', status: 'POSTED' }]);
    insertResults.push([]);
    updateResults.push([invoiceRow({ id: INV_A, status: 'PAID' })]);
    updateResults.push([invoiceRow({ id: INV_B, status: 'PARTIALLY_PAID' })]);

    const result = await PaymentService.recordCustomerPayment(
      {
        customerId: CUSTOMER_ID,
        paymentDate: '2026-06-01',
        amount: '2500.00',
        cashAccountId: CASH_ACCOUNT_ID,
      },
      CTX,
      tx
    );

    const allocationValues = (tx.insert as jest.Mock).mock.results[1].value.values.mock.calls[0][0];
    expect(allocationValues).toEqual([
      { paymentId: PAYMENT_ID, invoiceId: INV_A, allocatedAmount: '1000.00' },
      { paymentId: PAYMENT_ID, invoiceId: INV_B, allocatedAmount: '1500.00' },
    ]);
    expect(result.allocations).toHaveLength(2);
  });

  it('rejects a payment with no outstanding invoices', async () => {
    const { tx, selectResults } = makeTx();
    selectResults.push([]);

    await expect(
      PaymentService.recordCustomerPayment(
        {
          customerId: CUSTOMER_ID,
          paymentDate: '2026-06-01',
          amount: '100.00',
          cashAccountId: CASH_ACCOUNT_ID,
        },
        CTX,
        tx
      )
    ).rejects.toThrow('no outstanding invoices');
  });
});
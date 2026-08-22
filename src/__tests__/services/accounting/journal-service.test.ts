/**
 * Unit tests for the Part 2 journal engine (spec §5–§7, §25).
 *
 * Strategy: pure unit tests - PostgreSQL is NEVER contacted. The Drizzle
 * transaction handle is replaced by a chain-recording stub, and the sibling
 * services (numbers / periods / accounts) are jest.mock'ed. This keeps the
 * suite fast and lets us assert exact business gates: state machine,
 * optimistic locking, balance checks, mirror-line reversals.
 */
import { JournalService } from '@/services/accounting/journal-service';
import { NumberService } from '@/services/accounting/number-service';
import { PeriodService } from '@/services/accounting/period-service';
import { AccountService } from '@/services/accounting/account-service';
import { runInFinancialTransaction, getAccountingDb } from '@/db/pg-client';
import { journalPostings } from '@/db/schema/accounting/journal-entries';
import {
  AccountingNotFoundError,
  AccountingValidationError,
  ConcurrentModificationError,
  DocumentNotEditableError,
  InvalidStateTransitionError,
  UnbalancedEntryError,
} from '@/utils/accounting-errors';
import type { ActorContext } from '@/services/accounting/service-types';

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
  PeriodService: { getOpenPeriodFor: jest.fn(), seedCurrentYearPeriods: jest.fn() },
}));

jest.mock('@/services/accounting/account-service', () => ({
  AccountService: { getPostableAccount: jest.fn() },
}));

type Row = Record<string, unknown>;

/** Chain-recording Drizzle query stub; thenable so bare `await builder` resolves. */
interface QueryStub {
  select: jest.Mock;
  from: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  offset: jest.Mock;
  for: jest.Mock;
  values: jest.Mock;
  set: jest.Mock;
  returning: jest.Mock;
  then: (onFulfilled?: (value: Row[]) => unknown, onRejected?: (error: unknown) => unknown) => void;
  catch: (onRejected?: (error: unknown) => unknown) => void;
}

function queryStub(result: Row[]): QueryStub {
  const pending = Promise.resolve(result);
  const stub: QueryStub = {
    select: jest.fn(() => stub),
    from: jest.fn(() => stub),
    where: jest.fn(() => stub),
    orderBy: jest.fn(() => stub),
    limit: jest.fn(() => stub),
    offset: jest.fn(() => pending),
    for: jest.fn(() => pending),
    values: jest.fn(() => stub),
    set: jest.fn(() => stub),
    returning: jest.fn(() => pending),
    then: (
      onFulfilled?: (value: Row[]) => unknown,
      onRejected?: (error: unknown) => unknown
    ): void => {
      void pending.then(onFulfilled, onRejected);
    },
    catch: (onRejected?: (error: unknown) => unknown): void => {
      void pending.catch(onRejected);
    },
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
  tx: TxStub;
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
  return { tx, selectResults, insertResults, updateResults };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

import type { JournalEntryRow, JournalPostingRow } from '@/db/schema/accounting';
import type { WriteJournalEntryInput } from '@/services/accounting/journal-service';

const CTX: ActorContext = { userId: 'user-1', userName: 'Alice User' };
const ENTRY_ID = '11111111-1111-4111-8111-111111111111';
const CASH_ID = '22222222-2222-4222-8222-222222222222';
const REV_ID = '33333333-3333-4333-8333-333333333333';
const PERIOD_ID = '44444444-4444-4444-8444-444444444444';

function entryRow(overrides: Partial<JournalEntryRow> = {}): JournalEntryRow {
  return {
    id: ENTRY_ID,
    entryNumber: 'JE-2026-000001',
    entryDate: '2026-05-15',
    postingDate: null,
    accountingPeriodId: null,
    memo: null,
    reference: null,
    sourceType: 'MANUAL',
    sourceId: null,
    status: 'DRAFT',
    totalDebit: '100.00',
    totalCredit: '100.00',
    version: 1,
    createdBy: CTX.userId,
    createdByName: CTX.userName,
    approvedBy: null,
    approvedAt: null,
    postedBy: null,
    postedAt: null,
    reversedBy: null,
    reversedAt: null,
    reversalOfId: null,
    reversalReason: null,
    createdAt: new Date('2026-05-15T10:00:00Z'),
    updatedAt: new Date('2026-05-15T10:00:00Z'),
    ...overrides,
  } as JournalEntryRow;
}

function postingRow(overrides: Partial<JournalPostingRow> = {}): JournalPostingRow {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    journalEntryId: ENTRY_ID,
    accountId: CASH_ID,
    debit: '100.00',
    credit: '0.00',
    description: null,
    lineNumber: 1,
    createdAt: new Date('2026-05-15T10:00:00Z'),
    ...overrides,
  } as JournalPostingRow;
}

const BALANCED_INPUT: WriteJournalEntryInput = {
  entryDate: '2026-05-15',
  memo: ' May rent ',
  lines: [
    { accountId: CASH_ID, debit: '100.00' },
    { accountId: REV_ID, credit: '100' },
  ],
};

/** Wires the mocked transaction wrapper to execute against this test's tx stub. */
function primeTxRunner(h: ReturnType<typeof makeTx>): void {
  (runInFinancialTransaction as jest.Mock).mockImplementation(
    (fn: (t: unknown) => unknown) => Promise.resolve(fn(h.tx))
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (NumberService.nextDocumentNumber as jest.Mock).mockResolvedValue('JE-2026-000002');
  (PeriodService.getOpenPeriodFor as jest.Mock).mockResolvedValue({ id: PERIOD_ID });
  (AccountService.getPostableAccount as jest.Mock).mockResolvedValue({ id: CASH_ID });
});

describe('createDraft', () => {
  it('writes header + ordered lines inside one transaction', async () => {
    const h = makeTx();
    primeTxRunner(h);
    const saved = entryRow();
    h.insertResults.push([saved]);
    h.selectResults.push([
      postingRow(),
      postingRow({
        id: '66666666-6666-4666-8666-666666666666',
        accountId: REV_ID,
        debit: '0.00',
        credit: '100.00',
        lineNumber: 2,
      }),
    ]);

    const result = await JournalService.createDraft(BALANCED_INPUT, CTX);

    expect(NumberService.nextDocumentNumber).toHaveBeenCalledWith(h.tx, 'JE', 2026);
    expect(h.tx.insert).toHaveBeenCalledTimes(2); // header, then postings
    expect(result.entry.entryNumber).toBe('JE-2026-000001');
    expect(result.lines.map((l) => l.lineNumber)).toEqual([1, 2]);

    // Header snapshot: DRAFT status, trimmed memo, actor denormalized.
    const headerPayload = h.tx.insert.mock.results[0].value.values.mock.calls[0][0] as Row;
    expect(headerPayload.status).toBe('DRAFT');
    expect(headerPayload.memo).toBe('May rent');
    expect(headerPayload.createdBy).toBe(CTX.userId);
  });

  it('normalizes one-sided amounts (blank side becomes 0.00)', async () => {
    const h = makeTx();
    primeTxRunner(h);
    h.insertResults.push([entryRow()]);
    h.selectResults.push([postingRow()]);

    await JournalService.createDraft(
      {
        entryDate: '2026-05-15',
        lines: [
          { accountId: CASH_ID, debit: '10', credit: '0' },
          { accountId: REV_ID, credit: '10' },
        ],
      },
      CTX
    );

    const postingsPayload = h.tx.insert.mock.results[1].value.values.mock.calls[0][0] as Row[];
    expect(postingsPayload[0]).toMatchObject({ debit: '10.00', credit: '0.00' });
    expect(postingsPayload[1]).toMatchObject({ debit: '0.00', credit: '10.00' });
  });

  it.each([
    ['fewer than two lines', { lines: [{ accountId: CASH_ID, debit: '5' }] }],
    [
      'both sides populated on one line',
      {
        lines: [
          { accountId: CASH_ID, debit: '50', credit: '50' },
          { accountId: REV_ID, credit: '50' },
        ],
      },
    ],
    [
      'a zero-valued line',
      {
        lines: [
          { accountId: CASH_ID, debit: '50' },
          { accountId: REV_ID, debit: '0' },
        ],
      },
    ],
    [
      'the same account on multiple lines',
      {
        lines: [
          { accountId: CASH_ID, debit: '25' },
          { accountId: CASH_ID, debit: '25' },
        ],
      },
    ],
  ])('rejects %s before touching the database', async (_label, input) => {
    const h = makeTx();
    primeTxRunner(h);

    await expect(
      JournalService.createDraft({
        ...BALANCED_INPUT,
        ...(input as object),
      } as WriteJournalEntryInput, CTX)
    ).rejects.toBeInstanceOf(AccountingValidationError);
    expect(runInFinancialTransaction).not.toHaveBeenCalled();
  });

  it('rejects unbalanced totals with UnbalancedEntryError', async () => {
    await expect(
      JournalService.createDraft(
        {
          entryDate: '2026-05-15',
          lines: [
            { accountId: CASH_ID, debit: '100' },
            { accountId: REV_ID, credit: '90' },
          ],
        },
        CTX
      )
    ).rejects.toBeInstanceOf(UnbalancedEntryError);
  });
});

describe('updateDraft', () => {
  it('deletes old lines, bumps version, rewrites the header', async () => {
    const h = makeTx();
    primeTxRunner(h);
    h.selectResults.push([entryRow()]); // lockEntry (version 1)
    h.updateResults.push([entryRow({ version: 2, memo: 'Updated' })]);
    h.selectResults.push([postingRow()]); // loadLines after rewrite

    const result = await JournalService.updateDraft(
      ENTRY_ID,
      { ...BALANCED_INPUT, memo: 'Updated' },
      CTX,
      1
    );

    expect(h.tx.delete).toHaveBeenCalledWith(journalPostings);
    const setPayload = h.tx.update.mock.results[0].value.set.mock.calls[0][0] as Row;
    expect(setPayload.version).toBe(2);
    expect(setPayload.memo).toBe('Updated');
    expect(result.entry.version).toBe(2);
  });

  it('refuses to edit a non-DRAFT entry', async () => {
    const h = makeTx();
    primeTxRunner(h);
    h.selectResults.push([entryRow({ status: 'PENDING_APPROVAL' })]);

    await expect(
      JournalService.updateDraft(ENTRY_ID, BALANCED_INPUT, CTX)
    ).rejects.toBeInstanceOf(DocumentNotEditableError);
    expect(h.tx.update).not.toHaveBeenCalled();
  });

  it('rejects a stale expectedVersion (optimistic lock)', async () => {
    const h = makeTx();
    primeTxRunner(h);
    h.selectResults.push([entryRow({ version: 7 })]);

    await expect(
      JournalService.updateDraft(ENTRY_ID, BALANCED_INPUT, CTX, 5)
    ).rejects.toBeInstanceOf(ConcurrentModificationError);
  });
});

describe('approval flow', () => {
  it('submitForApproval moves DRAFT -> PENDING_APPROVAL and bumps version', async () => {
    const h = makeTx();
    primeTxRunner(h);
    h.selectResults.push([entryRow()]);
    h.updateResults.push([entryRow({ status: 'PENDING_APPROVAL', version: 2 })]);

    const row = await JournalService.submitForApproval(ENTRY_ID, CTX, 1);

    const setPayload = h.tx.update.mock.results[0].value.set.mock.calls[0][0] as Row;
    expect(setPayload.status).toBe('PENDING_APPROVAL');
    expect(row.version).toBe(2);
  });

  it('approve stamps APPROVED with approver identity', async () => {
    const h = makeTx();
    primeTxRunner(h);
    h.selectResults.push([entryRow({ status: 'PENDING_APPROVAL', version: 2 })]);
    h.updateResults.push([entryRow({ status: 'APPROVED', version: 3, approvedBy: CTX.userId })]);

    const row = await JournalService.approve(ENTRY_ID, CTX, 2);

    const setPayload = h.tx.update.mock.results[0].value.set.mock.calls[0][0] as Row;
    expect(setPayload.status).toBe('APPROVED');
    expect(setPayload.approvedBy).toBe(CTX.userId);
    expect(setPayload.approvedAt).toBeInstanceOf(Date);
    expect(row.version).toBe(3);
  });

  it.each([
    ['submitForApproval', entryRow({ status: 'APPROVED' })],
    ['approve', entryRow()],
  ])('%s rejects entries not in the required state', async (method, wrongState) => {
    const h = makeTx();
    primeTxRunner(h);
    h.selectResults.push([wrongState]);

    const call =
      method === 'submitForApproval'
        ? JournalService.submitForApproval(ENTRY_ID, CTX)
        : JournalService.approve(ENTRY_ID, CTX);

    await expect(call).rejects.toBeInstanceOf(DocumentNotEditableError);
    expect(h.tx.update).not.toHaveBeenCalled();
  });
});

describe('post gates', () => {
  function primeApproved(h: ReturnType<typeof makeTx>, lines: JournalPostingRow[]): void {
    primeTxRunner(h);
    h.selectResults.push([entryRow({ status: 'APPROVED', version: 3 })]); // lockEntry
    h.selectResults.push(lines); // loadLines
  }

  it('stamps POSTED with period + actor after re-checking every line', async () => {
    const h = makeTx();
    primeApproved(h, [
      postingRow(),
      postingRow({ id: '66666666-6666-4666-8666-666666666666', accountId: REV_ID, debit: '0.00', credit: '100.00', lineNumber: 2 }),
    ]);
    h.updateResults.push([
      entryRow({ status: 'POSTED', version: 4, accountingPeriodId: PERIOD_ID }),
    ]);

    const result = await JournalService.post(ENTRY_ID, CTX);

    expect(PeriodService.getOpenPeriodFor).toHaveBeenCalledWith(h.tx, expect.any(Date));
    expect(AccountService.getPostableAccount).toHaveBeenCalledTimes(2);
    const setPayload = h.tx.update.mock.results[0].value.set.mock.calls[0][0] as Row;
    expect(setPayload.status).toBe('POSTED');
    expect(setPayload.accountingPeriodId).toBe(PERIOD_ID);
    expect(setPayload.postedBy).toBe(CTX.userId);
    expect(result.entry.version).toBe(4);
  });

  it('refuses anything not APPROVED', async () => {
    const h = makeTx();
    primeTxRunner(h);
    h.selectResults.push([entryRow({ status: 'DRAFT' })]);

    await expect(JournalService.post(ENTRY_ID, CTX)).rejects.toBeInstanceOf(
      InvalidStateTransitionError
    );
    expect(h.tx.update).not.toHaveBeenCalled();
  });

  it('aborts when the entry date falls in a closed period', async () => {
    const h = makeTx();
    primeApproved(h, [postingRow()]);
    (PeriodService.getOpenPeriodFor as jest.Mock).mockRejectedValue(
      new Error('PERIOD_CLOSED: 2026-05')
    );

    await expect(JournalService.post(ENTRY_ID, CTX)).rejects.toThrow(/PERIOD_CLOSED/);
    expect(h.tx.update).not.toHaveBeenCalled();
  });

  it('aborts when STORED lines no longer balance', async () => {
    const h = makeTx();
    primeApproved(h, [
      postingRow(),
      postingRow({ id: '77777777-7777-4777-8777-777777777777', accountId: REV_ID, debit: '0.00', credit: '90.00', lineNumber: 2 }),
    ]);

    await expect(JournalService.post(ENTRY_ID, CTX)).rejects.toBeInstanceOf(UnbalancedEntryError);
    expect(h.tx.update).not.toHaveBeenCalled();
  });
});

describe('reverse', () => {
  it('requires a reason before any database work', async () => {
    await expect(JournalService.reverse(ENTRY_ID, '   ', CTX)).rejects.toBeInstanceOf(
      AccountingValidationError
    );
    expect(runInFinancialTransaction).not.toHaveBeenCalled();
  });

  it('refuses non-POSTED entries', async () => {
    const h = makeTx();
    primeTxRunner(h);
    h.selectResults.push([entryRow({ status: 'APPROVED' })]);

    await expect(JournalService.reverse(ENTRY_ID, 'wrong amount', CTX)).rejects.toBeInstanceOf(
      InvalidStateTransitionError
    );
  });

  it('creates a mirrored auto-posted entry and cross-links both ways', async () => {
    const h = makeTx();
    primeTxRunner(h);
    const REVERSAL_ID = '88888888-8888-4888-8888-888888888888';
    h.selectResults.push([entryRow({ status: 'POSTED', version: 4 })]); // lock original
    h.selectResults.push([
      postingRow(), // Dr 100 cash
      postingRow({ id: '66666666-6666-4666-8666-666666666666', accountId: REV_ID, debit: '0.00', credit: '100.00', lineNumber: 2 }),
    ]);
    h.insertResults.push([
      entryRow({
        id: REVERSAL_ID,
        entryNumber: 'JE-2026-000009',
        status: 'POSTED',
        memo: 'Reversal of JE-2026-000001: wrong amount',
        reversalOfId: ENTRY_ID,
        reversalReason: 'wrong amount',
      }),
    ]);
    h.updateResults.push([
      entryRow({ status: 'REVERSED', version: 5, reversalOfId: REVERSAL_ID }),
    ]);
    h.selectResults.push([
      postingRow({ journalEntryId: REVERSAL_ID, debit: '0.00', credit: '100.00' }), // mirrored
      postingRow({ journalEntryId: REVERSAL_ID, accountId: REV_ID, debit: '100.00', credit: '0.00', lineNumber: 2 }),
    ]);

    const { original, reversal } = await JournalService.reverse(ENTRY_ID, 'wrong amount', CTX);

    expect(NumberService.nextDocumentNumber).toHaveBeenCalledWith(h.tx, 'JE', Number(new Date().toISOString().slice(0, 4)));
    const mirrorPayload = h.tx.insert.mock.results[1].value.values.mock.calls[0][0] as Row[];
    expect(mirrorPayload[0]).toMatchObject({ accountId: CASH_ID, debit: '0.00', credit: '100.00' });
    expect(mirrorPayload[1]).toMatchObject({ accountId: REV_ID, debit: '100.00', credit: '0.00' });
    const originalSet = h.tx.update.mock.results[0].value.set.mock.calls[0][0] as Row;
    expect(originalSet.status).toBe('REVERSED');
    expect(originalSet.reversalOfId).toBe(REVERSAL_ID);
    expect(original.version).toBe(5);
    expect(reversal.entry.reversalOfId).toBe(ENTRY_ID);
    expect(reversal.entry.memo).toContain('JE-2026-000001');
    expect(reversal.entry.memo).toContain('wrong amount');
  });
});

describe('deleteDraft', () => {
  it('refuses anything past DRAFT - history is immutable', async () => {
    const h = makeTx();
    primeTxRunner(h);
    h.selectResults.push([entryRow({ status: 'APPROVED' })]);

    await expect(JournalService.deleteDraft(ENTRY_ID, CTX)).rejects.toBeInstanceOf(
      DocumentNotEditableError
    );
    expect(h.tx.delete).not.toHaveBeenCalled();
  });

  it('honors optimistic locking before deleting', async () => {
    const h = makeTx();
    primeTxRunner(h);
    h.selectResults.push([entryRow({ version: 7 })]);

    await expect(JournalService.deleteDraft(ENTRY_ID, CTX, 3)).rejects.toBeInstanceOf(
      ConcurrentModificationError
    );
    expect(h.tx.delete).not.toHaveBeenCalled();
  });

  it('removes postings first, then the entry, when DRAFT and version matches', async () => {
    const h = makeTx();
    primeTxRunner(h);
    h.selectResults.push([entryRow({ version: 1 })]);

    await JournalService.deleteDraft(ENTRY_ID, CTX, 1);

    expect(h.tx.delete).toHaveBeenCalledTimes(2);
  });
});

describe('list / getById (read-only singleton path)', () => {
  /** Like queryStub, but each await consumes the next queued batch (for multi-select flows). */
  function chainStub(batches: Row[][]): QueryStub {
    const queue = [...batches];
    const stub: QueryStub = {
      select: jest.fn(() => stub),
      from: jest.fn(() => stub),
      where: jest.fn(() => stub),
      orderBy: jest.fn(() => stub),
      limit: jest.fn(() => stub),
      offset: jest.fn(() => stub),
      for: jest.fn(() => stub),
      values: jest.fn(() => stub),
      set: jest.fn(() => stub),
      returning: jest.fn(() => Promise.resolve(queue.shift() ?? [])),
      then: (
        onFulfilled?: (value: Row[]) => unknown,
        onRejected?: (error: unknown) => unknown
      ): void => {
        void Promise.resolve(queue.shift() ?? []).then(onFulfilled, onRejected);
      },
      catch: (onRejected?: (error: unknown) => unknown): void => {
        void Promise.resolve(queue.shift() ?? []).catch(onRejected);
      },
    };
    return stub;
  }

  it('lists with filters and clamps limit to 200', async () => {
    const stub = chainStub([[entryRow()]]);
    (getAccountingDb as jest.Mock).mockReturnValue(stub);

    const rows = await JournalService.list({
      status: 'POSTED',
      sourceType: 'MANUAL',
      fromDate: new Date('2026-01-01'),
      toDate: new Date('2026-12-31'),
      limit: 5000,
    });

    expect(rows).toHaveLength(1);
    expect(stub.where).toHaveBeenCalledTimes(1);
    expect(stub.limit).toHaveBeenCalledWith(200);
    expect(stub.orderBy).toHaveBeenCalledTimes(1);
  });

  it('defaults to limit 50 when no filters are given', async () => {
    const stub = chainStub([[]]);
    (getAccountingDb as jest.Mock).mockReturnValue(stub);

    await JournalService.list();

    expect(stub.limit).toHaveBeenCalledWith(50);
    expect(stub.where).toHaveBeenCalledWith(undefined);
  });

  it('getById throws AccountingNotFoundError when the entry is missing', async () => {
    const stub = chainStub([[]]);
    (getAccountingDb as jest.Mock).mockReturnValue(stub);

    await expect(JournalService.getById(ENTRY_ID)).rejects.toBeInstanceOf(AccountingNotFoundError);
  });

  it('getById returns the entry together with its lines', async () => {
    const lineTwo = postingRow({
      id: '66666666-6666-4666-8666-666666666666',
      accountId: REV_ID,
      debit: '0.00',
      credit: '100.00',
      lineNumber: 2,
    });
    const stub = chainStub([[entryRow()], [postingRow(), lineTwo]]);
    (getAccountingDb as jest.Mock).mockReturnValue(stub);

    const result = await JournalService.getById(ENTRY_ID);

    expect(result.entry.id).toBe(ENTRY_ID);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[1].credit).toBe('100.00');
  });
});

/**
 * Journal entry lifecycle (spec §5–§7, §25).
 *
 * State machine:  DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTED -> REVERSED
 * - POSTED rows are immutable; corrections happen ONLY via reversing entries
 *   (mirrored Dr/Cr, own number, `reversalOfId` cross-link) - spec §7.2.
 * - Every mutation bumps the optimistic-lock `version`; concurrent editors
 *   receive ConcurrentModificationError instead of silent lost updates.
 * - Posting runs in ONE transaction: row lock -> status/period/postable/balance
 *   gates -> header + postings written atomically. Any failure rolls back everything.
 * - Entry numbers are assigned at CREATION from `document_counters` inside the
 *   caller's transaction (unique forever, annual reset policy).
 */
import { and, asc, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { runInFinancialTransaction, type AccountingTx } from '@/db/pg-client';
import {
  journalEntries,
  journalPostings,
  type JournalEntryRow,
  type JournalPostingRow,
} from '@/db/schema/accounting';
import {
  AccountingNotFoundError,
  AccountingValidationError,
  ConcurrentModificationError,
  DocumentNotEditableError,
  InvalidStateTransitionError,
  UnbalancedEntryError,
} from '@/utils/accounting-errors';
import { compareMoney, parseMoney, sumMoney } from '@/utils/money';
import type { AccountingSourceType, JournalStatus } from '@/types/accounting-types';
import { AccountService } from './account-service';
import { NumberService } from './number-service';
import { PeriodService } from './period-service';
import { resolveExec, type ActorContext, type AccountingExec } from './service-types';

/** Converts a Date to the ISO day-string format used by `date` columns. */
function toIsoDate(value: Date | string): string {
  const iso = typeof value === 'string' ? value : value.toISOString();
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new AccountingValidationError(`Invalid date: ${String(value)}`);
  }
  return day;
}

export interface JournalLineInput {
  accountId: string;
  /** Exactly ONE of debit/credit must be a positive amount; the other side stays zero. */
  debit?: unknown;
  credit?: unknown;
  description?: string | null;
}

export interface WriteJournalEntryInput {
  entryDate: Date | string;
  memo?: string | null;
  reference?: string | null;
  lines: JournalLineInput[];
}

/**
 * Input for {@link JournalService.createPosted} - the direct-to-POSTED path
 * used by document flows (invoice issue, payments) that must write their
 * accounting in the same transaction as the business document (spec §8).
 * Unlike DRAFT lines, accounts MAY repeat across lines (e.g. two invoice
 * lines booking to one revenue account).
 */
export interface PostJournalInput {
  entryDate: Date | string;
  memo?: string | null;
  reference?: string | null;
  sourceType: AccountingSourceType;
  sourceId: string;
  lines: Array<{
    accountId: string;
    debit?: unknown;
    credit?: unknown;
    description?: string | null;
  }>;
}

export interface JournalEntryWithLines {
  entry: JournalEntryRow;
  lines: JournalPostingRow[];
}

/** Optional filters for {@link JournalService.list}. */
export interface ListJournalEntriesFilters {
  status?: JournalStatus;
  sourceType?: AccountingSourceType;
  /** Inclusive lower bound on entry date (ISO day `YYYY-MM-DD`, or Date). */
  fromDate?: Date | string;
  /** Inclusive upper bound on entry date (ISO day `YYYY-MM-DD`, or Date). */
  toDate?: Date | string;
  /** Page size, clamped to 1..200. Default 50. */
  limit?: number;
  /** Pagination offset. Default 0. */
  offset?: number;
}

interface NormalizedLine {
  accountId: string;
  debit: string;
  credit: string;
  description: string | null;
}

/** Validates + normalizes raw line inputs; enforces >= 2 lines, one-sided amounts, balance. */
function normalizeLines(input: readonly JournalLineInput[]): {
  lines: NormalizedLine[];
  totalDebit: string;
  totalCredit: string;
} {
  if (!Array.isArray(input) || input.length < 2) {
    throw new AccountingValidationError('A journal entry requires at least two lines');
  }

  const seenAccounts = new Set<string>();
  const lines: NormalizedLine[] = input.map((raw, index) => {
    const position = index + 1;
    if (!raw?.accountId || typeof raw.accountId !== 'string') {
      throw new AccountingValidationError(`Line ${position}: accountId is required`);
    }

    const debit = parseMoney(raw.debit ?? '0');
    const credit = parseMoney(raw.credit ?? '0');
    const debitPositive = compareMoney(debit, '0.00') > 0;
    const creditPositive = compareMoney(credit, '0.00') > 0;

    if (debitPositive && creditPositive) {
      throw new AccountingValidationError(
        `Line ${position}: an amount may appear on only one side (debit OR credit)`
      );
    }
    if (!debitPositive && !creditPositive) {
      throw new AccountingValidationError(`Line ${position}: amount must be greater than zero`);
    }

    seenAccounts.add(raw.accountId);
    return {
      accountId: raw.accountId,
      debit: debitPositive ? debit : '0.00',
      credit: creditPositive ? credit : '0.00',
      description: raw.description?.trim() || null,
    };
  });

  if (seenAccounts.size !== input.length) {
    throw new AccountingValidationError('The same account may not appear on multiple lines');
  }

  const totalDebit = sumMoney(lines.map((l) => l.debit));
  const totalCredit = sumMoney(lines.map((l) => l.credit));
  if (compareMoney(totalDebit, totalCredit) !== 0) {
    throw new UnbalancedEntryError('draft');
  }
  return { lines, totalDebit, totalCredit };
}

async function insertPostings(
  exec: AccountingTx,
  entryId: string,
  lines: readonly NormalizedLine[]
): Promise<void> {
  await exec.insert(journalPostings).values(
    lines.map((line, index) => ({
      journalEntryId: entryId,
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      description: line.description,
      lineNumber: index + 1,
    }))
  );
}

async function loadLines(
  exec: AccountingExec,
  entryId: string
): Promise<JournalPostingRow[]> {
  return exec
    .select()
    .from(journalPostings)
    .where(eq(journalPostings.journalEntryId, entryId))
    .orderBy(asc(journalPostings.lineNumber));
}

/** Row-locked fetch used by every mutating flow. */
async function lockEntry(exec: AccountingTx, id: string): Promise<JournalEntryRow> {
  const [row] = await exec
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, id))
    .for('update');
  if (!row) {
    throw new AccountingNotFoundError('Journal entry', id);
  }
  return row;
}

/** Asserts the row still carries the version the caller read (spec §25). */
function assertVersion(row: JournalEntryRow, expectedVersion: number | undefined): void {
  if (expectedVersion !== undefined && row.version !== expectedVersion) {
    throw new ConcurrentModificationError(row.entryNumber);
  }
}

/** Single-step gate: the row must currently be in `expected`. */
function requireStatus(
  row: JournalEntryRow,
  expected: JournalEntryRow['status'],
  action: string
): void {
  if (row.status !== expected) {
    throw new DocumentNotEditableError(
      row.entryNumber,
      `${row.status} (${action} requires ${expected})`
    );
  }
}

export const JournalService = {
  /**
   * Creates a balanced DRAFT entry. The entry number is assigned immediately
   * from the yearly counter inside this transaction.
   */
  async createDraft(
    input: WriteJournalEntryInput,
    ctx: ActorContext,
    exec?: AccountingExec
  ): Promise<JournalEntryWithLines> {
    const { lines, totalDebit, totalCredit } = normalizeLines(input.lines);
    const entryDate = toIsoDate(input.entryDate);

    // Writes inside a caller-supplied transaction when provided (e.g. Part 3
    // document flows that must atomically include their JE); otherwise opens one.
    const write = async (tx: AccountingTx): Promise<JournalEntryWithLines> => {
      const entryNumber = await NumberService.nextDocumentNumber(
        tx,
        'JE',
        Number(entryDate.slice(0, 4))
      );

      const [entry] = await tx
        .insert(journalEntries)
        .values({
          entryNumber,
          entryDate,
          memo: input.memo?.trim() || null,
          reference: input.reference?.trim() || null,
          status: 'DRAFT',
          totalDebit,
          totalCredit,
          createdBy: ctx.userId,
          createdByName: ctx.userName,
        })
        .returning();

      await insertPostings(tx, entry!.id, lines);
      return { entry: entry!, lines: await loadLines(tx, entry!.id) };
    };

    return exec ? write(exec as AccountingTx) : runInFinancialTransaction(write);
  },

  /**
   * Rewrites a DRAFT's memo/reference/lines wholesale. Optimistic lock:
   * pass the `version` the caller last read or face ConcurrentModificationError.
   */
  async updateDraft(
    id: string,
    input: WriteJournalEntryInput,
    ctx: ActorContext,
    expectedVersion?: number
  ): Promise<JournalEntryWithLines> {
    const { lines, totalDebit, totalCredit } = normalizeLines(input.lines);
    const entryDate = toIsoDate(input.entryDate);

    return runInFinancialTransaction(async (tx) => {
      const current = await lockEntry(tx, id);
      requireStatus(current, 'DRAFT', 'edit');
      assertVersion(current, expectedVersion);

      await tx.delete(journalPostings).where(eq(journalPostings.journalEntryId, id));

      const [entry] = await tx
        .update(journalEntries)
        .set({
          entryDate,
          memo: input.memo?.trim() || null,
          reference: input.reference?.trim() || null,
          totalDebit,
          totalCredit,
          version: current.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(journalEntries.id, id))
        .returning();

      await insertPostings(tx, id, lines);
      return { entry: entry!, lines: await loadLines(tx, id) };
    });
  },

  /** DRAFT -> PENDING_APPROVAL. */
  async submitForApproval(id: string, ctx: ActorContext, expectedVersion?: number) {
    return runInFinancialTransaction(async (tx) => {
      const current = await lockEntry(tx, id);
      requireStatus(current, 'DRAFT', 'submit');
      assertVersion(current, expectedVersion);
      const [entry] = await tx
        .update(journalEntries)
        .set({ status: 'PENDING_APPROVAL', version: current.version + 1, updatedAt: new Date() })
        .where(eq(journalEntries.id, id))
        .returning();
      return entry!;
    });
  },

  /** PENDING_APPROVAL -> APPROVED. Records who approved and when. */
  async approve(id: string, ctx: ActorContext, expectedVersion?: number) {
    return runInFinancialTransaction(async (tx) => {
      const current = await lockEntry(tx, id);
      requireStatus(current, 'PENDING_APPROVAL', 'approve');
      assertVersion(current, expectedVersion);
      const [entry] = await tx
        .update(journalEntries)
        .set({
          status: 'APPROVED',
          approvedBy: ctx.userId,
          approvedAt: new Date(),
          version: current.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(journalEntries.id, id))
        .returning();
      return entry!;
    });
  },

  /**
   * APPROVED -> POSTED. The financial gate: inside one transaction we re-lock
   * the row, verify the period is OPEN, every line's account is postable +
   * active, and stored totals still balance - then stamp POSTED.
   */
  async post(id: string, ctx: ActorContext, exec?: AccountingTx): Promise<JournalEntryWithLines> {
    const write = async (tx: AccountingTx): Promise<JournalEntryWithLines> => {
      const current = await lockEntry(tx, id);
      if (current.status !== 'APPROVED') {
        throw new InvalidStateTransitionError('Journal entry', current.status, 'POSTED');
      }

      const period = await PeriodService.getOpenPeriodFor(
        tx,
        new Date(`${current.entryDate}T00:00:00Z`)
      );

      const lines = await loadLines(tx, id);
      for (const line of lines) {
        await AccountService.getPostableAccount(tx, line.accountId);
      }
      const totalDebit = sumMoney(lines.map((l) => l.debit));
      const totalCredit = sumMoney(lines.map((l) => l.credit));
      if (compareMoney(totalDebit, totalCredit) !== 0) {
        throw new UnbalancedEntryError(current.entryNumber);
      }

      const [entry] = await tx
        .update(journalEntries)
        .set({
          status: 'POSTED',
          postingDate: toIsoDate(new Date()),
          postedBy: ctx.userId,
          postedAt: new Date(),
          accountingPeriodId: period.id,
          version: current.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(journalEntries.id, id), eq(journalEntries.status, 'APPROVED')))
        .returning();

      return { entry: entry!, lines };
    };
    return exec ? write(exec) : runInFinancialTransaction(write);
  },

  /**
   * POSTED -> REVERSED (terminal). Creates the mirrored correcting entry in
   * the SAME transaction: swapped Dr/Cr lines, its own yearly number, dated
   * TODAY (must fall in an OPEN period), auto-posted after re-running the
   * posting gates against current account states. Cross-linked both ways so
   * audits can walk original <-> reversal.
   */
  async reverse(
    id: string,
    reason: string,
    ctx: ActorContext,
    exec?: AccountingTx
  ): Promise<{ original: JournalEntryRow; reversal: JournalEntryWithLines }> {
    const trimmed = reason?.trim();
    if (!trimmed) {
      throw new AccountingValidationError('A reason is required to reverse a posted entry');
    }

    const write = async (tx: AccountingTx): Promise<{
      original: JournalEntryRow;
      reversal: JournalEntryWithLines;
    }> => {
      const original = await lockEntry(tx, id);
      if (original.status !== 'POSTED') {
        throw new InvalidStateTransitionError('Journal entry', original.status, 'REVERSED');
      }

      const todayIso = toIsoDate(new Date());
      const period = await PeriodService.getOpenPeriodFor(
        tx,
        new Date(`${todayIso}T00:00:00Z`)
      );

      // Mirror every line (same accounts, swapped sides).
      const sourceLines = await loadLines(tx, id);
      const mirrored: NormalizedLine[] = sourceLines.map((line) => ({
        accountId: line.accountId,
        debit: line.credit,
        credit: line.debit,
        description: line.description ?? null,
      }));
      for (const line of mirrored) {
        await AccountService.getPostableAccount(tx, line.accountId);
      }

      const totalDebit = sumMoney(mirrored.map((l) => l.debit));
      const totalCredit = sumMoney(mirrored.map((l) => l.credit));
      const entryNumber = await NumberService.nextDocumentNumber(
        tx,
        'JE',
        Number(todayIso.slice(0, 4))
      );

      const [reversal] = await tx
        .insert(journalEntries)
        .values({
          entryNumber,
          entryDate: todayIso,
          memo: `Reversal of ${original.entryNumber}: ${trimmed}`,
          reference: original.reference ?? null,
          status: 'POSTED',
          postingDate: todayIso,
          postedBy: ctx.userId,
          postedAt: new Date(),
          accountingPeriodId: period.id,
          totalDebit,
          totalCredit,
          createdBy: ctx.userId,
          createdByName: ctx.userName,
          reversalOfId: original.id,
          reversalReason: trimmed,
        })
        .returning();

      await insertPostings(tx, reversal!.id, mirrored);

      const [updatedOriginal] = await tx
        .update(journalEntries)
        .set({
          status: 'REVERSED',
          reversedBy: ctx.userId,
          reversedAt: new Date(),
          reversalOfId: reversal!.id,
          version: original.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(journalEntries.id, id), eq(journalEntries.status, 'POSTED')))
        .returning();

      return {
        original: updatedOriginal!,
        reversal: { entry: reversal!, lines: await loadLines(tx, reversal!.id) },
      };
    };
    return exec ? write(exec) : runInFinancialTransaction(write);
  },

  /** Hard-deletes a DRAFT (postings first). Anything past DRAFT is immutable history. */
  async deleteDraft(id: string, ctx: ActorContext, expectedVersion?: number): Promise<void> {
    await runInFinancialTransaction(async (tx) => {
      const current = await lockEntry(tx, id);
      requireStatus(current, 'DRAFT', 'delete');
      assertVersion(current, expectedVersion);

      await tx.delete(journalPostings).where(eq(journalPostings.journalEntryId, id));
      await tx.delete(journalEntries).where(eq(journalEntries.id, id));
    });
    void ctx;
  },

  /** Lists entries newest-first; optional status/date-range/source filters. Read-only (no tx). */
  async list(filters: ListJournalEntriesFilters = {}): Promise<JournalEntryRow[]> {
    const conditions: SQL[] = [];
    if (filters.status) {
      conditions.push(eq(journalEntries.status, filters.status));
    }
    if (filters.sourceType) {
      conditions.push(eq(journalEntries.sourceType, filters.sourceType));
    }
    if (filters.fromDate) {
      conditions.push(gte(journalEntries.entryDate, toIsoDate(filters.fromDate)));
    }
    if (filters.toDate) {
      conditions.push(lte(journalEntries.entryDate, toIsoDate(filters.toDate)));
    }

    const limit = Math.min(Math.max(Math.trunc(filters.limit ?? 50), 1), 200);
    const offset = Math.max(Math.trunc(filters.offset ?? 0), 0);

    return resolveExec()
      .select()
      .from(journalEntries)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(journalEntries.entryDate), desc(journalEntries.createdAt))
      .limit(limit)
      .offset(offset);
  },

  /** Fetches one entry with its lines; throws AccountingNotFoundError when absent. */
  async getById(id: string): Promise<JournalEntryWithLines> {
    const exec = resolveExec();
    const [entry] = await exec
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, id))
      .limit(1);
    if (!entry) {
      throw new AccountingNotFoundError('Journal entry', id);
    }
    return { entry, lines: await loadLines(exec, id) };
  },

  // __PART3_ANCHOR__

  /**
   * POSTs a journal entry directly, bypassing the DRAFT lifecycle. Used by
   * document flows (invoice issue, customer payments) that must record their
   * accounting ATOMICALLY in the SAME transaction as the document itself
   * (spec §8) - the JE is financially effective the moment it lands.
   *
   * Differs from {@link createDraft}: accounts MAY repeat across lines, the
   * entry is inserted as POSTED (with postingDate/source linkage), and the
   * open-period + postable-account gates run here. Accepts an optional caller
   * transaction; opens its own when none is given.
   */
  async createPosted(
    input: PostJournalInput,
    ctx: ActorContext,
    exec?: AccountingTx
  ): Promise<JournalEntryWithLines> {
    const entryDate = toIsoDate(input.entryDate);
    const todayIso = toIsoDate(new Date());

    if (!Array.isArray(input.lines) || input.lines.length < 2) {
      throw new AccountingValidationError('A posted journal entry requires at least two lines');
    }

    const normalized: NormalizedLine[] = input.lines.map((raw, index) => {
      if (!raw?.accountId || typeof raw.accountId !== 'string') {
        throw new AccountingValidationError(`Line ${index + 1}: accountId is required`);
      }
      const debit = parseMoney(raw.debit ?? '0.00');
      const credit = parseMoney(raw.credit ?? '0.00');
      const hasDebit = compareMoney(debit, '0.00') > 0;
      const hasCredit = compareMoney(credit, '0.00') > 0;
      if (!hasDebit && !hasCredit) {
        throw new AccountingValidationError(`Line ${index + 1}: amount must be greater than zero`);
      }
      if (hasDebit && hasCredit) {
        throw new AccountingValidationError(
          `Line ${index + 1}: an amount may appear on only one side`
        );
      }
      return {
        accountId: raw.accountId,
        debit,
        credit,
        description: raw.description?.trim() || null,
      };
    });

    const totalDebit = sumMoney(normalized.map((l) => l.debit));
    const totalCredit = sumMoney(normalized.map((l) => l.credit));
    if (compareMoney(totalDebit, totalCredit) !== 0) {
      throw new UnbalancedEntryError(input.reference ?? 'document');
    }

    const write = async (tx: AccountingTx): Promise<JournalEntryWithLines> => {
      const period = await PeriodService.getOpenPeriodFor(tx, new Date(`${entryDate}T00:00:00Z`));
      for (const line of normalized) {
        await AccountService.getPostableAccount(tx, line.accountId);
      }

      const entryNumber = await NumberService.nextDocumentNumber(
        tx,
        'JE',
        Number(entryDate.slice(0, 4))
      );

      const [entry] = await tx
        .insert(journalEntries)
        .values({
          entryNumber,
          entryDate,
          postingDate: todayIso,
          accountingPeriodId: period.id,
          memo: input.memo?.trim() || null,
          reference: input.reference?.trim() || null,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          status: 'POSTED',
          totalDebit,
          totalCredit,
          createdBy: ctx.userId,
          createdByName: ctx.userName,
          postedBy: ctx.userId,
          postedAt: new Date(),
        })
        .returning();

      await insertPostings(tx, entry!.id, normalized);
      return { entry: entry!, lines: normalized as unknown as JournalPostingRow[] };
    };

    return exec ? write(exec) : runInFinancialTransaction(write);
  },
};


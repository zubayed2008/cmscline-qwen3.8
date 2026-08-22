/**
 * Financial reporting engine (spec §15) - read-only aggregations over
 * POSTED journal postings.
 *
 * Status window: reports include BOTH `POSTED` and `REVERSED` entries.
 * A reversal writes its mirrored entry as `POSTED` and flips the ORIGINAL to
 * `REVERSED`; including both sides makes each reversed pair net to zero,
 * which is the accounting-correct view. DRAFT/PENDING_APPROVAL/APPROVED
 * entries never appear.
 *
 * Money rule: every amount crosses these boundaries as a fixed 2-decimal
 * string (SQL `numeric`/`sum()` results are strings) and all arithmetic
 * goes through `src/utils/money.ts`. No floats.
 */
import { and, asc, count, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import {
  accounts,
  invoices,
  journalEntries,
  journalPostings,
  vendorBills,
} from '@/db/schema/accounting';
import {
  AccountingValidationError,
} from '@/utils/accounting-errors';
import {
  addMoney,
  compareMoney,
  isMoneyZero,
  subtractMoney,
  sumMoney,
} from '@/utils/money';
import type {
  AccountType,
  AgingBucketKey,
  IBalanceSheet,
  IBalanceSheetSection,
  IAgingBucket,
  IAgingReport,
  ILedgerRow,
  IProfitLoss,
  IProfitLossRow,
  ITrialBalance,
  ITrialBalanceRow,
  NormalBalance,
  PaginatedResult,
} from '@/types/accounting-types';
import { resolveExec, type AccountingExec } from './service-types';

/**
 * Financially-effective entry statuses (see header comment for the REVERSED
 * rationale). DRAFT/PENDING_APPROVAL/APPROVED are never reportable.
 */
const POSTED_STATUSES = ['POSTED', 'REVERSED'] as const;

/** Canonical display order for aging buckets (oldest last). */
const AGING_BUCKET_ORDER: readonly AgingBucketKey[] = ['CURRENT', '1-30', '31-60', '61-90', '90+'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Signed balance for a normal-balance direction: Debit accounts debit-positive, Credit accounts credit-positive. */
function netFor(normalBalance: NormalBalance, debit: string, credit: string): string {
  const net = subtractMoney(debit, credit); // debit - credit
  return normalBalance === 'Debit' ? net : subtractMoney('0.00', net);
}

/** Builds the shared POSTED-status + asOf filter used by the ledger-style reports. */
function reportConditions(asOf?: string): SQL[] {
  const conditions: SQL[] = [inArray(journalEntries.status, [...POSTED_STATUSES])];
  if (asOf) conditions.push(lte(journalEntries.entryDate, asOf));
  return conditions;
}

/** Shared per-account aggregation selection (debit/credit sums as strings). */
function accountAggregateSelect() {
  return {
    accountId: journalPostings.accountId,
    code: accounts.code,
    name: accounts.name,
    type: accounts.type,
    normalBalance: accounts.normalBalance,
    debit: sql<string>`coalesce(sum(${journalPostings.debit}), 0)`,
    credit: sql<string>`coalesce(sum(${journalPostings.credit}), 0)`,
  };
}

export const LedgerService = {
  /**
   * Trial balance as of an optional date - every account with any POSTED
   * activity, its debit/credit totals and the signed net balance. Excludes
   * DRAFT/APPROVED entries entirely; reversed pairs net to zero.
   */
  async trialBalance(asOf?: string, exec?: AccountingExec): Promise<ITrialBalance> {
    const db = resolveExec(exec);
    const rows = await db
      .select(accountAggregateSelect())
      .from(journalPostings)
      .innerJoin(accounts, eq(journalPostings.accountId, accounts.id))
      .innerJoin(journalEntries, eq(journalPostings.journalEntryId, journalEntries.id))
      .where(and(...reportConditions(asOf)))
      .groupBy(
        journalPostings.accountId,
        accounts.code,
        accounts.name,
        accounts.type,
        accounts.normalBalance
      )
      .orderBy(asc(accounts.code));

    const items: ITrialBalanceRow[] = rows.map((row) => ({
      accountId: row.accountId,
      code: row.code,
      name: row.name,
      type: row.type as AccountType,
      debit: row.debit,
      credit: row.credit,
      balance: subtractMoney(row.debit, row.credit),
    }));

    const totalDebit = sumMoney(items.map((r) => r.debit));
    const totalCredit = sumMoney(items.map((r) => r.credit));

    return {
      asOf: asOf ?? null,
      rows: items,
      totalDebit,
      totalCredit,
      balanced: compareMoney(totalDebit, totalCredit) === 0,
    };
  },

  /**
   * Profit & Loss for an inclusive [from, to] period: Revenue credited and
   * Expense debited, both positive on their normal side, with net income.
   */
  async profitLoss(from: string, to: string, exec?: AccountingExec): Promise<IProfitLoss> {
    if (compareMoney(from, to) > 0) {
      throw new AccountingValidationError('The P&L "from" date must not be after "to"');
    }
    const db = resolveExec(exec);
    const rows = await db
      .select(accountAggregateSelect())
      .from(journalPostings)
      .innerJoin(accounts, eq(journalPostings.accountId, accounts.id))
      .innerJoin(journalEntries, eq(journalPostings.journalEntryId, journalEntries.id))
      .where(
        and(
          ...reportConditions(),
          gte(journalEntries.entryDate, from),
          lte(journalEntries.entryDate, to),
          inArray(accounts.type, ['Revenue', 'Expense'])
        )
      )
      .groupBy(
        journalPostings.accountId,
        accounts.code,
        accounts.name,
        accounts.type,
        accounts.normalBalance
      )
      .orderBy(asc(accounts.code));

    const toRow = (row: (typeof rows)[number]): IProfitLossRow => ({
      accountId: row.accountId,
      code: row.code,
      name: row.name,
      amount: netFor(row.normalBalance, row.debit, row.credit),
    });

    const revenues = rows.filter((r) => r.type === 'Revenue').map(toRow);
    const expenses = rows.filter((r) => r.type === 'Expense').map(toRow);
    const totalRevenue = sumMoney(revenues.map((r) => r.amount));
    const totalExpenses = sumMoney(expenses.map((r) => r.amount));

    return {
      from,
      to,
      revenues,
      expenses,
      totalRevenue,
      totalExpenses,
      netIncome: subtractMoney(totalRevenue, totalExpenses),
    };
  },

  /**
   * Balance sheet as of a date (defaults to today). Sections from account
   * balances (Asset/Expense debit-normal, the rest credit-normal); the
   * current calendar year's net income is ploughed into Equity. When
   * Assets != Liabilities + Equity + NetIncome the statement still returns
   * (best-effort) but `balanced` is false and `warning` explains.
   */
  async balanceSheet(asOf?: string, exec?: AccountingExec): Promise<IBalanceSheet> {
    const db = resolveExec(exec);
    const effectiveAsOf = asOf ?? todayIso();

    const rows = await db
      .select(accountAggregateSelect())
      .from(journalPostings)
      .innerJoin(accounts, eq(journalPostings.accountId, accounts.id))
      .innerJoin(journalEntries, eq(journalPostings.journalEntryId, journalEntries.id))
      .where(and(...reportConditions(effectiveAsOf)))
      .groupBy(
        journalPostings.accountId,
        accounts.code,
        accounts.name,
        accounts.type,
        accounts.normalBalance
      )
      .orderBy(asc(accounts.code));

    // Current-year net income (the equity plug): revenue - expense for all
    // posted activity in the calendar year of `asOf`, up to and including it.
    const year = Number(effectiveAsOf.slice(0, 4));
    const yearStart = `${year}-01-01`;
    const yearRows = await db
      .select({
        type: accounts.type,
        normalBalance: accounts.normalBalance,
        debit: sql<string>`coalesce(sum(${journalPostings.debit}), 0)`,
        credit: sql<string>`coalesce(sum(${journalPostings.credit}), 0)`,
      })
      .from(journalPostings)
      .innerJoin(accounts, eq(journalPostings.accountId, accounts.id))
      .innerJoin(journalEntries, eq(journalPostings.journalEntryId, journalEntries.id))
      .where(
        and(
          ...reportConditions(effectiveAsOf),
          gte(journalEntries.entryDate, yearStart),
          inArray(accounts.type, ['Revenue', 'Expense'])
        )
      )
      .groupBy(accounts.type, accounts.normalBalance);

    const revenueNet = sumMoney(
      yearRows.filter((r) => r.type === 'Revenue').map((r) => netFor(r.normalBalance, r.debit, r.credit))
    );
    const expenseNet = sumMoney(
      yearRows.filter((r) => r.type === 'Expense').map((r) => netFor(r.normalBalance, r.debit, r.credit))
    );
    const netIncome = subtractMoney(revenueNet, expenseNet);

    const buildSection = (
      title: 'Assets' | 'Liabilities' | 'Equity',
      type: AccountType
    ): IBalanceSheetSection => {
      const items = rows
        .filter((r) => r.type === type)
        .map((r) => ({ accountId: r.accountId, code: r.code, name: r.name, amount: netFor(r.normalBalance, r.debit, r.credit) }))
        .filter((r) => !isMoneyZero(r.amount));
      return { title, rows: items, total: sumMoney(items.map((r) => r.amount)) };
    };

    const assets = buildSection('Assets', 'Asset');
    const liabilities = buildSection('Liabilities', 'Liability');
    const equityBase = buildSection('Equity', 'Equity');

    const totalAssets = assets.total;
    // Equity section carries the net-income plug so Assets == Liabilities + Equity holds.
    const equityTotal = addMoney(equityBase.total, netIncome);
    const totalLiabilitiesEquity = addMoney(liabilities.total, equityTotal);
    const balanced = compareMoney(totalAssets, totalLiabilitiesEquity) === 0;

    return {
      asOf: effectiveAsOf,
      assets,
      liabilities,
      equity: { ...equityBase, total: equityTotal },
      totalAssets,
      totalLiabilitiesEquity,
      netIncome,
      balanced,
      warning: balanced
        ? null
        : `The balance sheet is out of balance by ${subtractMoney(totalLiabilitiesEquity, totalAssets)}`,
    };
  },

  /**
   * General Ledger - paginated POSTED posting lines with a running balance
   * (signed, debit positive) computed over the returned window. Optional
   * filters: date range, single account, or journal number.
   */
  async getGeneralLedger(
    filters: {
      from?: string;
      to?: string;
      accountId?: string;
      journalNumber?: string;
      page?: number;
      limit?: number;
    } = {},
    exec?: AccountingExec
  ): Promise<PaginatedResult<ILedgerRow> & { totalDebit: string; totalCredit: string }> {
    const db = resolveExec(exec);
    const conditions: SQL[] = [inArray(journalEntries.status, [...POSTED_STATUSES])];
    if (filters.from) conditions.push(gte(journalEntries.entryDate, filters.from));
    if (filters.to) conditions.push(lte(journalEntries.entryDate, filters.to));
    if (filters.accountId) conditions.push(eq(journalPostings.accountId, filters.accountId));
    if (filters.journalNumber) conditions.push(eq(journalEntries.entryNumber, filters.journalNumber));

    const page = Math.max(Math.trunc(filters.page ?? 1), 1);
    const limit = Math.min(Math.max(Math.trunc(filters.limit ?? 50), 1), 200);
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: journalPostings.id,
        entryDate: journalEntries.entryDate,
        entryNumber: journalEntries.entryNumber,
        memo: journalEntries.memo,
        accountId: journalPostings.accountId,
        accountCode: accounts.code,
        accountName: accounts.name,
        debit: journalPostings.debit,
        credit: journalPostings.credit,
      })
      .from(journalPostings)
      .innerJoin(accounts, eq(journalPostings.accountId, accounts.id))
      .innerJoin(journalEntries, eq(journalPostings.journalEntryId, journalEntries.id))
      .where(and(...conditions))
      .orderBy(asc(journalEntries.entryDate), asc(journalEntries.createdAt), asc(journalPostings.lineNumber))
      .limit(limit)
      .offset(offset);

    const [countRow] = await db
      .select({ value: count() })
      .from(journalPostings)
      .innerJoin(accounts, eq(journalPostings.accountId, accounts.id))
      .innerJoin(journalEntries, eq(journalPostings.journalEntryId, journalEntries.id))
      .where(and(...conditions));

    let running = '0.00';
    const items: ILedgerRow[] = rows.map((row) => {
      running = addMoney(running, subtractMoney(row.debit, row.credit));
      return { ...row, balance: running };
    });

    return {
      items,
      total: Number(countRow?.value ?? 0),
      page,
      limit,
      totalDebit: sumMoney(rows.map((r) => r.debit)),
      totalCredit: sumMoney(rows.map((r) => r.credit)),
    };
  },

  /**
   * Accounts Receivable aging as of a date (defaults to today): open
   * invoices bucketed by days past due (Current / 1-30 / 31-60 / 61-90 / 90+)
   * via SQL CASE-WHEN date math (spec §15.3).
   */
  async arAging(asOf?: string, exec?: AccountingExec): Promise<IAgingReport> {
    const db = resolveExec(exec);
    const effectiveAsOf = asOf ?? todayIso();

    const result = await db.execute(sql`
      SELECT
        CASE
          WHEN ${sql.param(effectiveAsOf)} - i.due_date <= 0 THEN 'CURRENT'
          WHEN ${sql.param(effectiveAsOf)} - i.due_date <= 30 THEN '1-30'
          WHEN ${sql.param(effectiveAsOf)} - i.due_date <= 60 THEN '31-60'
          WHEN ${sql.param(effectiveAsOf)} - i.due_date <= 90 THEN '61-90'
          ELSE '90+'
        END AS bucket,
        COUNT(*)::int AS document_count,
        COALESCE(SUM(i.balance_due), 0) AS amount
      FROM ${invoices} i
      WHERE i.status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
        AND i.balance_due > 0
      GROUP BY 1
    `);

    return buildAgingReport(
      effectiveAsOf,
      result.rows as Array<{ bucket: string; document_count: number; amount: string }>
    );
  },

  /**
   * Accounts Payable aging as of a date (defaults to today): posted bills
   * bucketed by days past due (Current / 1-30 / 31-60 / 61-90 / 90+).
   */
  async apAging(asOf?: string, exec?: AccountingExec): Promise<IAgingReport> {
    const db = resolveExec(exec);
    const effectiveAsOf = asOf ?? todayIso();

    const result = await db.execute(sql`
      SELECT
        CASE
          WHEN ${sql.param(effectiveAsOf)} - vb.due_date <= 0 THEN 'CURRENT'
          WHEN ${sql.param(effectiveAsOf)} - vb.due_date <= 30 THEN '1-30'
          WHEN ${sql.param(effectiveAsOf)} - vb.due_date <= 60 THEN '31-60'
          WHEN ${sql.param(effectiveAsOf)} - vb.due_date <= 90 THEN '61-90'
          ELSE '90+'
        END AS bucket,
        COUNT(*)::int AS document_count,
        COALESCE(SUM(vb.balance_due), 0) AS amount
      FROM ${vendorBills} vb
      WHERE vb.status IN ('POSTED', 'PARTIALLY_PAID')
        AND vb.balance_due > 0
      GROUP BY 1
    `);

    return buildAgingReport(
      effectiveAsOf,
      result.rows as Array<{ bucket: string; document_count: number; amount: string }>
    );
  },
};

/** Normalizes raw SQL aging rows into canonical bucket order + totals. */
function buildAgingReport(
  asOf: string,
  rows: Array<{ bucket: string; document_count: number; amount: string }>
): IAgingReport {
  const byBucket = new Map<AgingBucketKey, IAgingBucket>();
  for (const row of rows) {
    const key = row.bucket as AgingBucketKey;
    byBucket.set(key, {
      bucket: key,
      amount: row.amount,
      documentCount: Number(row.document_count),
    });
  }
  const buckets = AGING_BUCKET_ORDER.map((bucket) => byBucket.get(bucket)).filter(
    (b): b is IAgingBucket => b !== undefined
  );
  return { asOf, buckets, total: sumMoney(buckets.map((b) => b.amount)) };
}

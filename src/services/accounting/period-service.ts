/**
 * Accounting period lifecycle (spec §9).
 *
 * Periods are the calendar months of a fiscal year. Financial posting is only
 * allowed into OPEN periods. Closing/reopening is an admin action audited via
 * the Mongo AuditService AFTER the guarded UPDATE commits - auditing must
 * never roll back or block the financial operation itself.
 */
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { accountingPeriods, type AccountingPeriodRow } from '@/db/schema/accounting';
import {
  AccountingConflictError,
  AccountingValidationError,
  PeriodClosedError,
} from '@/utils/accounting-errors';
import { resolveExec, type AccountingExec } from './service-types';

/** Converts a Date to the ISO day string format used by `date` columns. */
function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Best-effort Mongo audit trail after commit. Delegates to the shared
 * accounting audit bridge (fire-and-forget; failures logged, never thrown).
 */
async function auditPeriodChange(
  userId: string,
  period: AccountingPeriodRow,
  outcome: 'CLOSED' | 'REOPENED',
  reason: string
): Promise<void> {
  const { auditAccountingEvent } = await import('./audit-bridge');
  auditAccountingEvent({
    action: 'update',
    entityType: 'accounting_period',
    entityId: period.id,
    userId,
    summary: {
      period: period.name,
      fiscalYear: period.fiscalYear,
      outcome,
      reason,
    },
  });
}

export const PeriodService = {
  /**
   * Creates the 12 calendar months of the current year as OPEN periods.
   * Idempotent - existing (year, periodNumber) pairs are left untouched.
   * Returns how many periods were actually created.
   */
  async seedCurrentYearPeriods(exec?: AccountingExec): Promise<number> {
    const db = resolveExec(exec);
    const year = new Date().getUTCFullYear();

    const rows = Array.from({ length: 12 }, (_, month) => {
      const start = new Date(Date.UTC(year, month, 1));
      const end = new Date(Date.UTC(year, month + 1, 0)); // day 0 = last day of prev month
      return {
        name: `${start.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })} ${year}`,
        fiscalYear: year,
        periodNumber: month + 1,
        startDate: toIsoDate(start),
        endDate: toIsoDate(end),
      };
    });

    const inserted = await db
      .insert(accountingPeriods)
      .values(rows)
      .onConflictDoNothing()
      .returning({ id: accountingPeriods.id });
    return inserted.length;
  },

  /**
   * Returns the OPEN period covering `date`, throwing otherwise:
   * - no covering row at all -> validation error (seed data missing)
   * - covering row exists but is CLOSED -> PERIOD_CLOSED conflict
   */
  async getOpenPeriodFor(exec: AccountingExec, date: Date): Promise<AccountingPeriodRow> {
    const iso = toIsoDate(date);
    const [row] = await exec
      .select()
      .from(accountingPeriods)
      .where(and(lte(accountingPeriods.startDate, iso), gte(accountingPeriods.endDate, iso)));

    if (!row) {
      throw new AccountingValidationError(
        `No accounting period covers ${iso}. Seed periods first (npm run seed:accounting).`
      );
    }
    if (row.status !== 'OPEN') {
      throw new PeriodClosedError(row.name);
    }
    return row;
  },

  /** Lists periods newest fiscal year first; within a year, chronological. */
  async listPeriods(fiscalYear?: number): Promise<AccountingPeriodRow[]> {
    const db = resolveExec();
    if (fiscalYear !== undefined) {
      return db
        .select()
        .from(accountingPeriods)
        .where(eq(accountingPeriods.fiscalYear, fiscalYear))
        .orderBy(asc(accountingPeriods.periodNumber));
    }
    return db
      .select()
      .from(accountingPeriods)
      .orderBy(desc(accountingPeriods.fiscalYear), asc(accountingPeriods.periodNumber));
  },

  /** Closes an OPEN period. Guarded conditional update - no double-close races. */
  async closePeriod(id: string, userId: string, reason: string): Promise<AccountingPeriodRow> {
    const trimmed = reason?.trim();
    if (!trimmed) {
      throw new AccountingValidationError('A reason is required to close a period');
    }

    const [updated] = await resolveExec()
      .update(accountingPeriods)
      .set({ status: 'CLOSED', closedBy: userId, closedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(accountingPeriods.id, id), eq(accountingPeriods.status, 'OPEN')))
      .returning();

    if (!updated) {
      throw new AccountingConflictError(`Accounting period ${id} is not open`);
    }
    await auditPeriodChange(userId, updated, 'CLOSED', trimmed);
    return updated;
  },

  /** Reopens a CLOSED period. Guarded conditional update - no double-reopen races. */
  async reopenPeriod(id: string, userId: string, reason: string): Promise<AccountingPeriodRow> {
    const trimmed = reason?.trim();
    if (!trimmed) {
      throw new AccountingValidationError('A reason is required to reopen a period');
    }

    const [updated] = await resolveExec()
      .update(accountingPeriods)
      .set({ status: 'OPEN', closedBy: null, closedAt: null, updatedAt: new Date() })
      .where(and(eq(accountingPeriods.id, id), eq(accountingPeriods.status, 'CLOSED')))
      .returning();

    if (!updated) {
      throw new AccountingConflictError(`Accounting period ${id} is not closed`);
    }
    await auditPeriodChange(userId, updated, 'REOPENED', trimmed);
    return updated;
  },
};

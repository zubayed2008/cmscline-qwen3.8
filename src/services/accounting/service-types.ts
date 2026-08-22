/**
 * Shared contracts for the accounting service layer.
 *
 * Convention: every function that runs INSIDE a financial transaction
 * receives the Drizzle transaction handle as its FIRST parameter (`exec`);
 * read-only helpers accept either the transaction or the pooled singleton
 * via {@link AccountingExec}. Public mutating flows wrap themselves in
 * `runInFinancialTransaction` and never expose `exec`.
 */
import { getAccountingDb, type AccountingDb, type AccountingTx } from '@/db/pg-client';

/** Anything that can execute accounting queries. */
export type AccountingExec = AccountingTx | AccountingDb;

/** Falls back to the pooled singleton when no transaction handle is given. */
export function resolveExec(exec?: AccountingExec): AccountingExec {
  return exec ?? getAccountingDb();
}

/**
 * Who is performing a financial action. Ids are Mongo `User._id` strings;
 * only the display name is denormalized onto financial rows.
 */
export interface ActorContext {
  userId: string | null;
  userName: string | null;
}

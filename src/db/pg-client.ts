/**
 * PostgreSQL (accounting) connection - pooled Drizzle singleton.
 *
 * The accounting engine lives in a DEDICATED `cms_accounting` database on the
 * same PostgreSQL instance that hosts Umami analytics (see
 * docker-compose.umami.yml). Mongo is never used for financial data.
 *
 * Mirrors the dev hot-reload caching pattern of `src/utils/db-connect.ts`:
 * the pool is stored on `globalThis` so Next.js HMR does not open a new pool
 * on every module re-evaluation. The lazy proxy keeps importing modules free
 * of top-level side effects (test-friendly, edge-safe).
 */
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import * as accountingSchema from '@/db/schema/accounting';

export type AccountingDb = NodePgDatabase<typeof accountingSchema>;

const DEFAULT_ACCOUNTING_URL =
  'postgresql://cms_accounting:change-me-accounting@localhost:5432/cms_accounting';

interface PgCache {
  pool?: Pool;
  db?: AccountingDb;
}

declare global {
  var __accountingPgCache: PgCache | undefined;
}

const cached: PgCache = global.__accountingPgCache ?? {};

if (!global.__accountingPgCache) {
  global.__accountingPgCache = cached;
}

function getPool(): Pool {
  if (!cached.pool) {
    const connectionString =
      process.env.ACCOUNTING_DATABASE_URL ??
      (process.env.NODE_ENV !== 'production' && process.env.JEST_WORKER_ID === undefined
        ? undefined
        : DEFAULT_ACCOUNTING_URL);

    if (!connectionString) {
      throw new Error(
        'ACCOUNTING_DATABASE_URL is required for the accounting engine. ' +
          'Create it once with: npm run db:accounting:create'
      );
    }

    cached.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    // A pooled client erroring out asynchronously must not crash the process.
    cached.pool.on('error', (err) => {
      console.error('[pg-client] Unexpected pool error:', err.message);
    });
  }

  return cached.pool;
}

/**
 * Returns the shared Drizzle instance bound to the pooled connection and the
 * full accounting schema. Safe to call repeatedly; one pool per process.
 */
export function getAccountingDb(): AccountingDb {
  if (!cached.db) {
    cached.db = drizzle(getPool(), { schema: accountingSchema });
  }
  return cached.db;
}

/**
 * Checks out a raw client from the pool. Exposed primarily for tests and
 * administrative queries; application code should use transactions instead
 * (see `runInFinancialTransaction`, Part 2).
 */
export async function getAccountingClient(): Promise<PoolClient> {
  return getPool().connect();
}

/** Transaction handle passed to code running inside a financial transaction. */
export type AccountingTx = Parameters<Parameters<AccountingDb['transaction']>[0]>[0];

/**
 * Runs `fn` inside ONE PostgreSQL transaction - all-or-nothing (spec §8).
 *
 * Every operation that mutates a business document AND its accounting
 * records MUST run through this helper. The default READ COMMITTED
 * isolation is sufficient: document counters rely on atomic
 * `UPDATE ... RETURNING` row locks, and journal posting re-reads the
 * locked entry row inside the same transaction.
 */
export async function runInFinancialTransaction<T>(
  fn: (exec: AccountingTx) => Promise<T>
): Promise<T> {
  return getAccountingDb().transaction(fn);
}

/**
 * Closes the pool explicitly. Intended for scripts and test teardown -
 * never call this from request-handling code.
 */
export async function closeAccountingPool(): Promise<void> {
  if (cached.pool) {
    await cached.pool.end();
    cached.pool = undefined;
    cached.db = undefined;
    delete global.__accountingPgCache?.pool;
    delete global.__accountingPgCache?.db;
  }
}

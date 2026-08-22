/**
 * Idempotency for financial mutations (spec §26).
 *
 * A client-supplied key makes retried POSTs safe: the first successful
 * execution stores its HTTP status + JSON body snapshot; replays return the
 * snapshot instead of re-executing (no double postings). A key replayed with
 * a DIFFERENT request hash is a client bug -> DuplicateIdempotencyKeyError.
 * Expired rows are purged lazily on each acquire.
 */
import { eq, lt } from 'drizzle-orm';
import { idempotencyRecords } from '@/db/schema/accounting';
import { createHash } from 'crypto';
import { DuplicateIdempotencyKeyError } from '@/utils/accounting-errors';
import type { AccountingExec } from './service-types';

/** Replay window before a record expires (spec default: 24 hours). */
const RECORD_TTL_MS = 24 * 60 * 60 * 1000;

export interface AcquireResult {
  /** false -> caller executes the flow and MUST call complete(). */
  replayed: boolean;
  /** Present only when replayed: the stored outcome to return verbatim. */
  status?: number;
  body?: unknown;
}

export const IdempotencyService = {
  hashRequest(payload: unknown): string {
    return createHash('sha256').update(JSON.stringify(payload ?? null)).digest('hex');
  },

  /**
   * Claims `key` for this request. Returns {replayed:true,status,body} when
   * an identical completed request exists; otherwise reserves the row so
   * concurrent duplicates wait/fail instead of executing twice.
   */
  async acquire(
    exec: AccountingExec,
    key: string,
    endpoint: string,
    requestHash: string,
    ttlMs: number = RECORD_TTL_MS
  ): Promise<AcquireResult> {
    // Lazy purge - keeps the table bounded without a cron.
    await exec.delete(idempotencyRecords).where(lt(idempotencyRecords.expiresAt, new Date()));

    const inserted = await exec
      .insert(idempotencyRecords)
      .values({ key, endpoint, requestHash, expiresAt: new Date(Date.now() + ttlMs) })
      .onConflictDoNothing()
      .returning({ key: idempotencyRecords.key });

    if (inserted.length > 0) {
      return { replayed: false };
    }

    const [existing] = await exec
      .select()
      .from(idempotencyRecords)
      .where(eq(idempotencyRecords.key, key));

    if (!existing) {
      // Raced with the lazy purge between insert-conflict and select:
      // treat as claimable; the retrying caller re-inserts next round.
      return { replayed: false };
    }
    if (existing.requestHash !== requestHash) {
      throw new DuplicateIdempotencyKeyError(key);
    }
    if (existing.responseStatus !== null && existing.responseBody !== null) {
      return { replayed: true, status: existing.responseStatus, body: existing.responseBody };
    }
    // Same key+hash but incomplete (crashed mid-flow): allow the retry to run.
    return { replayed: false };
  },

  /** Stores the final outcome after a successful execution. */
  async complete(
    exec: AccountingExec,
    key: string,
    status: number,
    body: unknown
  ): Promise<void> {
    await exec
      .update(idempotencyRecords)
      .set({ responseStatus: status, responseBody: body })
      .where(eq(idempotencyRecords.key, key));
  },
};

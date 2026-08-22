/**
 * Idempotency-key store for financial mutations (spec §26).
 *
 * A client-supplied key makes retried POSTs safe: the first successful
 * execution stores its HTTP status + response body snapshot, and replays
 * return that snapshot instead of re-executing. Rows expire lazily via
 * `expiresAt` (purged opportunistically; see IdempotencyService).
 */
import { index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const idempotencyRecords = pgTable(
  'idempotency_records',
  {
    /** Client-supplied unique key (e.g. UUID per form submission). */
    key: text('key').primaryKey(),
    /** Route identifier the key was first used against. */
    endpoint: text('endpoint').notNull(),
    /** SHA-256 of the canonical request payload - detects key reuse w/ different body. */
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('idempotency_records_expires_idx').on(table.expiresAt)]
);

export type IdempotencyRecordRow = typeof idempotencyRecords.$inferSelect;
export type NewIdempotencyRecordRow = typeof idempotencyRecords.$inferInsert;

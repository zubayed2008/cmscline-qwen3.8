/**
 * Financial document numbering (spec §10).
 *
 * Format: `<DOCTYPE>-<YEAR>-000001`. Counters live in
 * `document_counters(doc_type, year)` and are incremented with an atomic
 * `UPDATE ... RETURNING` whose row lock serializes concurrent creators -
 * numbers are unique, never reused, and reset annually by design (the
 * policy is explicit: annual reset IS our numbering policy).
 *
 * MUST be invoked inside the caller's transaction so the counter row lock
 * spans the document INSERT as well.
 */
import { and, eq, sql } from 'drizzle-orm';
import { documentCounters } from '@/db/schema/accounting';
import type { AccountingExec } from './service-types';
import { resolveExec } from './service-types';

const SEQUENCE_WIDTH = 6;

export const NumberService = {
  /**
   * Returns the next document number, e.g. nextDocumentNumber(tx, 'JE', 2026)
   * -> "JE-2026-000042". Creates the counter row on first use per (type, year).
   */
  async nextDocumentNumber(
    exec: AccountingExec,
    docType: string,
    year: number
  ): Promise<string> {
    const db = resolveExec(exec);

    await db.insert(documentCounters).values({ docType, year }).onConflictDoNothing();

    const [row] = await db
      .update(documentCounters)
      .set({
        lastNumber: sql`${documentCounters.lastNumber} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(documentCounters.docType, docType), eq(documentCounters.year, year)))
      .returning({ lastNumber: documentCounters.lastNumber });

    if (!row) {
      // Cannot happen: the upsert above guarantees the row exists.
      throw new Error(`Document counter row vanished for ${docType}/${year}`);
    }

    return `${docType}-${year}-${String(row.lastNumber).padStart(SEQUENCE_WIDTH, '0')}`;
  },
};

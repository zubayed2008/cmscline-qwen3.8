/**
 * API-route helpers for the accounting module.
 *
 * Routes never touch the error taxonomy directly: they throw service errors
 * (or let Postgres throw), and this helper maps them to the standardized
 * `{ success:false, error, code, details }` envelope with machine-readable
 * accounting codes in `details.code`.
 */
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { runInFinancialTransaction, type AccountingTx } from '@/db/pg-client';
import { IdempotencyService } from '@/services/accounting/idempotency-service';
import { mapPgError } from './accounting-errors';
import { errorResponse } from './api-response';

/** Translates any thrown value into a safe envelope; raw driver errors never escape. */
export function handleAccountingError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return errorResponse('Validation failed', 400, details);
  }
  const mapped = mapPgError(error);
  return errorResponse(mapped.message, mapped.httpStatus, { code: mapped.code });
}

/** NextAuth session user subset used to build accounting ActorContext. */
interface SessionLike {
  user?: { id?: string | null; name?: string | null } | null;
}

/** Builds the ActorContext from a NextAuth session (id = Mongo ObjectId). */
export function actorFromSession(session: SessionLike | null): {
  userId: string | null;
  userName: string | null;
} {
  return {
    userId: session?.user?.id ?? null,
    userName: session?.user?.name ?? null,
  };
}

/**
 * Runs a financial mutation honoring the `Idempotency-Key` header (spec §26).
 *
 * The key acquisition, the mutation itself, and the outcome snapshot all
 * happen inside ONE PostgreSQL transaction, so replays can never double-post.
 * Without a key the mutation still runs in its own transaction.
 * Returns the full `{ success, data }` envelope to hand back to the client.
 */
export async function withIdempotency<T>(
  request: NextRequest,
  endpoint: string,
  hashPayload: unknown,
  execute: (tx: AccountingTx) => Promise<T>,
  statusFor: (result: T) => number
): Promise<NextResponse> {
  const key = request.headers.get('Idempotency-Key');
  let outcome: { replayed: boolean; status: number; body: unknown } | undefined;

  await runInFinancialTransaction(async (tx) => {
    if (key) {
      const requestHash = IdempotencyService.hashRequest(hashPayload);
      const acquired = await IdempotencyService.acquire(tx, key, endpoint, requestHash);
      if (acquired.replayed) {
        outcome = { replayed: true, status: acquired.status ?? 200, body: acquired.body };
        return;
      }
    }

    const result = await execute(tx);
    const body = { success: true as const, data: result };
    const status = statusFor(result);
    outcome = { replayed: false, status, body };
    if (key) {
      await IdempotencyService.complete(tx, key, status, body);
    }
  });

  return NextResponse.json(outcome!.body, { status: outcome!.status });
}
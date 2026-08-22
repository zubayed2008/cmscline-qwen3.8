import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { JournalService } from '@/services/accounting/journal-service';
import { actorFromSession, handleAccountingError, withIdempotency } from '@/utils/accounting-route';
import { journalReverseSchema } from '@/types/accounting-schemas';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/accounting/journal-entries/[id]/reverse (idempotent).
 * Body: { reason }. Creates the mirrored contra entry and marks the original
 * REVERSED - all inside ONE transaction.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = journalReverseSchema.parse(body);
    const actor = actorFromSession(session);

    return await withIdempotency(
      request,
      `/api/accounting/journal-entries/${id}/reverse`,
      { action: 'reverse', id, reason: parsed.reason },
      (tx) => JournalService.reverse(id, parsed.reason, actor, tx),
      () => 200
    );
  } catch (error) {
    return handleAccountingError(error);
  }
}
import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { JournalService } from '@/services/accounting/journal-service';
import { actorFromSession, handleAccountingError, withIdempotency } from '@/utils/accounting-route';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/accounting/journal-entries/[id]/post - APPROVED -> POSTED (idempotent).
 * Books the entry, its postings, and the counter in one transaction.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const actor = actorFromSession(session);

    return await withIdempotency(
      request,
      `/api/accounting/journal-entries/${id}/post`,
      { action: 'post', id },
      (tx) => JournalService.post(id, actor, tx),
      () => 200
    );
  } catch (error) {
    return handleAccountingError(error);
  }
}
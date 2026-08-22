import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { JournalService } from '@/services/accounting/journal-service';
import { actorFromSession, handleAccountingError } from '@/utils/accounting-route';
import { successResponse } from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/accounting/journal-entries/[id]/submit - DRAFT -> PENDING_APPROVAL.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const expectedVersion = typeof body?.expectedVersion === 'number' ? body.expectedVersion : undefined;
    const entry = await JournalService.submitForApproval(id, actorFromSession(session), expectedVersion);
    return successResponse(entry);
  } catch (error) {
    return handleAccountingError(error);
  }
}
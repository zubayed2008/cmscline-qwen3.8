import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { JournalService, type WriteJournalEntryInput } from '@/services/accounting/journal-service';
import { actorFromSession, handleAccountingError } from '@/utils/accounting-route';
import { journalEntryUpdateSchema } from '@/types/accounting-schemas';
import { errorResponse, successResponse } from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/accounting/journal-entries/[id] - entry with lines.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    return successResponse(await JournalService.getById(id));
  } catch (error) {
    return handleAccountingError(error);
  }
}

/**
 * PATCH /api/accounting/journal-entries/[id] - rewrites a DRAFT (optimistic lock).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = journalEntryUpdateSchema.parse(body);

    const existing = await JournalService.getById(id);
    const merged: WriteJournalEntryInput = {
      entryDate: parsed.entryDate ?? existing.entry.entryDate,
      memo: parsed.memo !== undefined ? parsed.memo : existing.entry.memo,
      reference: parsed.reference !== undefined ? parsed.reference : existing.entry.reference,
      lines:
        parsed.lines ??
        existing.lines.map((line) => ({
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          description: line.description ?? undefined,
        })),
    };

    const entry = await JournalService.updateDraft(id, merged, actorFromSession(session), parsed.expectedVersion);
    return successResponse(entry);
  } catch (error) {
    return handleAccountingError(error);
  }
}

/**
 * DELETE /api/accounting/journal-entries/[id] - deletes a DRAFT (postings first).
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    await JournalService.deleteDraft(id, actorFromSession(session));
    return successResponse({ message: 'Journal draft deleted' });
  } catch (error) {
    return handleAccountingError(error);
  }
}
import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { JournalService } from '@/services/accounting/journal-service';
import { actorFromSession, handleAccountingError } from '@/utils/accounting-route';
import { journalEntryCreateSchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';

/**
 * GET /api/accounting/journal-entries?status=&sourceType=&from=&to=&limit=&offset=
 * Lists entries newest-first (Admin).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const sp = new URL(request.url).searchParams;
    const entries = await JournalService.list({
      status: (sp.get('status') as never) ?? undefined,
      sourceType: (sp.get('sourceType') as never) ?? undefined,
      fromDate: sp.get('from') ?? undefined,
      toDate: sp.get('to') ?? undefined,
      limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
      offset: sp.get('offset') ? Number(sp.get('offset')) : undefined,
    });
    return successResponse(entries);
  } catch (error) {
    return handleAccountingError(error);
  }
}

/**
 * POST /api/accounting/journal-entries - creates a balanced DRAFT entry.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const parsed = journalEntryCreateSchema.parse(body);

    const entry = await JournalService.createDraft(parsed, actorFromSession(session));
    return successResponse(entry, 201);
  } catch (error) {
    return handleAccountingError(error);
  }
}
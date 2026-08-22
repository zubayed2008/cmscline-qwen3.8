import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { LedgerService } from '@/services/accounting/ledger-service';
import { handleAccountingError } from '@/utils/accounting-route';
import { ledgerQuerySchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';

/**
 * GET /api/accounting/ledger?from=&to=&accountId=&journalNumber=&page=&limit=
 * General Ledger - paginated POSTED postings with running balances.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const sp = new URL(request.url).searchParams;
    const parsed = ledgerQuerySchema.parse({
      from: sp.get('from') ?? undefined,
      to: sp.get('to') ?? undefined,
      accountId: sp.get('accountId') ?? undefined,
      journalNumber: sp.get('journalNumber') ?? undefined,
      page: sp.get('page') ?? undefined,
      limit: sp.get('limit') ?? undefined,
    });

    return successResponse(await LedgerService.getGeneralLedger(parsed));
  } catch (error) {
    return handleAccountingError(error);
  }
}

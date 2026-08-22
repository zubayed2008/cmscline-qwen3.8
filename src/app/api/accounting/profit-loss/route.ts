import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { LedgerService } from '@/services/accounting/ledger-service';
import { handleAccountingError } from '@/utils/accounting-route';
import { isoDateSchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';

/**
 * GET /api/accounting/profit-loss?from=YYYY-MM-DD&to=YYYY-MM-DD
 * P&L for an inclusive period (Revenue credited, Expense debited).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const sp = new URL(request.url).searchParams;
    const from = isoDateSchema.parse(sp.get('from'));
    const to = isoDateSchema.parse(sp.get('to'));

    return successResponse(await LedgerService.profitLoss(from, to));
  } catch (error) {
    return handleAccountingError(error);
  }
}

import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { LedgerService } from '@/services/accounting/ledger-service';
import { handleAccountingError } from '@/utils/accounting-route';
import { agingQuerySchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';

/**
 * GET /api/accounting/ar-aging?asOf=YYYY-MM-DD (defaults to today)
 * Accounts Receivable aging buckets (Current / 1-30 / 31-60 / 61-90 / 90+).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const sp = new URL(request.url).searchParams;
    const parsed = agingQuerySchema.parse({ asOf: sp.get('asOf') ?? undefined });

    return successResponse(await LedgerService.arAging(parsed.asOf));
  } catch (error) {
    return handleAccountingError(error);
  }
}

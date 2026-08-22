import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { LedgerService } from '@/services/accounting/ledger-service';
import { handleAccountingError } from '@/utils/accounting-route';
import { isoDateSchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';

/**
 * GET /api/accounting/trial-balance?asOf=YYYY-MM-DD
 * Trial balance as of an optional date (all posted activity when omitted).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const sp = new URL(request.url).searchParams;
    const asOfRaw = sp.get('asOf');
    const asOf = asOfRaw ? isoDateSchema.parse(asOfRaw) : undefined;

    return successResponse(await LedgerService.trialBalance(asOf));
  } catch (error) {
    return handleAccountingError(error);
  }
}

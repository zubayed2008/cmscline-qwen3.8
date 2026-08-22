import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { BillService } from '@/services/accounting/bill-service';
import { actorFromSession, handleAccountingError, withIdempotency } from '@/utils/accounting-route';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/bills/[id]/post (idempotent) - APPROVED -> POSTED.
 * Assigns the BILL-YYYY-###### number and books the accrual JE atomically:
 *   Dr <expense account(s)> / Dr 2200 Tax Payable / Cr 2100 AP.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const actor = actorFromSession(session);

    return await withIdempotency(
      request,
      `/api/bills/${id}/post`,
      { action: 'post', id },
      (tx) => BillService.post(id, actor, tx),
      () => 200
    );
  } catch (error) {
    return handleAccountingError(error);
  }
}

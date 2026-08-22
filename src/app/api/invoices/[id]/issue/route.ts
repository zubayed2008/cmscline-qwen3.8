import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { InvoiceService } from '@/services/accounting/invoice-service';
import { actorFromSession, handleAccountingError, withIdempotency } from '@/utils/accounting-route';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/invoices/[id]/issue (idempotent) - DRAFT -> ISSUED.
 * Assigns the INV-YYYY-###### number and books the accrual JE atomically:
 *   Dr 1200 AR / Cr revenue(s) / Cr 2200 Tax Payable.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const actor = actorFromSession(session);

    return await withIdempotency(
      request,
      `/api/invoices/${id}/issue`,
      { action: 'issue', id },
      (tx) => InvoiceService.issue(id, actor, tx),
      () => 200
    );
  } catch (error) {
    return handleAccountingError(error);
  }
}
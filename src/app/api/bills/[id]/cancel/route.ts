import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { BillService } from '@/services/accounting/bill-service';
import { actorFromSession, handleAccountingError } from '@/utils/accounting-route';
import { billActionSchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/bills/[id]/cancel - DRAFT/APPROVED -> CANCELLED (pre-post only;
 * nothing financial has been recorded yet, so no reversing is needed).
 * Body: { reason? }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = billActionSchema.parse(body ?? {});

    const bill = await BillService.cancel(id, actorFromSession(session));
    return successResponse({ bill, reason: parsed.reason ?? null });
  } catch (error) {
    return handleAccountingError(error);
  }
}

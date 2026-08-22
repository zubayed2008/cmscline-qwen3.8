import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { BillService } from '@/services/accounting/bill-service';
import { actorFromSession, handleAccountingError } from '@/utils/accounting-route';
import { successResponse } from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/bills/[id]/approve - DRAFT -> APPROVED (workflow gate; no
 * financial effect yet).
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    return successResponse(await BillService.approve(id, actorFromSession(session)));
  } catch (error) {
    return handleAccountingError(error);
  }
}

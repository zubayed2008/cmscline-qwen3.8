import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { PeriodService } from '@/services/accounting/period-service';
import { periodActionSchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';
import { handleAccountingError } from '@/utils/accounting-route';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/accounting/periods/[id]/reopen - reopens a CLOSED period (audited).
 * Body: { reason }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = periodActionSchema.parse(body);

    const period = await PeriodService.reopenPeriod(id, session.user.id, parsed.reason);
    return successResponse(period);
  } catch (error) {
    return handleAccountingError(error);
  }
}
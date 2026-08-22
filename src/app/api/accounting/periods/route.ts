import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { PeriodService } from '@/services/accounting/period-service';
import { successResponse } from '@/utils/api-response';
import { handleAccountingError } from '@/utils/accounting-route';

/**
 * GET /api/accounting/periods?fiscalYear=2026 - period list.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const fiscalYearParam = new URL(request.url).searchParams.get('fiscalYear');
    const fiscalYear = fiscalYearParam ? Number(fiscalYearParam) : undefined;
    const periods = await PeriodService.listPeriods(Number.isNaN(fiscalYear) ? undefined : fiscalYear);
    return successResponse(periods);
  } catch (error) {
    return handleAccountingError(error);
  }
}

/**
 * POST /api/accounting/periods - idempotently seeds the current fiscal
 * year's 12 OPEN monthly periods.
 */
export async function POST() {
  try {
    await requireAdmin();
    const created = await PeriodService.seedCurrentYearPeriods();
    return successResponse({ created }, 201);
  } catch (error) {
    return handleAccountingError(error);
  }
}
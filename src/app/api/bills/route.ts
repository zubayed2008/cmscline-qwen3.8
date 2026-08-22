import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { BillService } from '@/services/accounting/bill-service';
import { actorFromSession, handleAccountingError } from '@/utils/accounting-route';
import { billCreateSchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';

/**
 * GET /api/bills?vendorId=&status= - bill list.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const sp = new URL(request.url).searchParams;
    const bills = await BillService.list({
      vendorId: sp.get('vendorId') ?? undefined,
      status: sp.get('status') ?? undefined,
    });
    return successResponse(bills);
  } catch (error) {
    return handleAccountingError(error);
  }
}

/**
 * POST /api/bills - creates a DRAFT bill (no number, no accounting yet).
 * Totals are computed server-side only.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const parsed = billCreateSchema.parse(body);

    const bill = await BillService.createDraft(parsed, actorFromSession(session));
    return successResponse(bill, 201);
  } catch (error) {
    return handleAccountingError(error);
  }
}

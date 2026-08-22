import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { BillService } from '@/services/accounting/bill-service';
import { actorFromSession, handleAccountingError } from '@/utils/accounting-route';
import { billUpdateSchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bills/[id] - bill with lines.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    return successResponse(await BillService.getById(id));
  } catch (error) {
    return handleAccountingError(error);
  }
}

/**
 * PATCH /api/bills/[id] - rewrites a DRAFT (optimistic lock).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = billUpdateSchema.parse(body);

    const bill = await BillService.updateDraft(
      id,
      {
        billDate: parsed.billDate,
        dueDate: parsed.dueDate,
        notes: parsed.notes,
        lines: parsed.lines,
      },
      actorFromSession(session),
      parsed.expectedVersion
    );
    return successResponse(bill);
  } catch (error) {
    return handleAccountingError(error);
  }
}

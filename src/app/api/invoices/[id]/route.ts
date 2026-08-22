import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { InvoiceService } from '@/services/accounting/invoice-service';
import { actorFromSession, handleAccountingError } from '@/utils/accounting-route';
import { invoiceUpdateSchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/[id] - invoice with lines.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    return successResponse(await InvoiceService.getById(id));
  } catch (error) {
    return handleAccountingError(error);
  }
}

/**
 * PATCH /api/invoices/[id] - rewrites a DRAFT (optimistic lock).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = invoiceUpdateSchema.parse(body);

    const invoice = await InvoiceService.updateDraft(
      id,
      {
        issueDate: parsed.issueDate,
        dueDate: parsed.dueDate,
        notes: parsed.notes,
        lines: parsed.lines,
      },
      actorFromSession(session),
      parsed.expectedVersion
    );
    return successResponse(invoice);
  } catch (error) {
    return handleAccountingError(error);
  }
}
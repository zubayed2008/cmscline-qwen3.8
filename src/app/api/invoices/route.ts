import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { InvoiceService } from '@/services/accounting/invoice-service';
import { actorFromSession, handleAccountingError } from '@/utils/accounting-route';
import { invoiceCreateSchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';

/**
 * GET /api/invoices?customerId=&status= - invoice list (OVERDUE derived live).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const sp = new URL(request.url).searchParams;
    const invoices = await InvoiceService.list({
      customerId: sp.get('customerId') ?? undefined,
      status: sp.get('status') ?? undefined,
    });
    return successResponse(invoices);
  } catch (error) {
    return handleAccountingError(error);
  }
}

/**
 * POST /api/invoices - creates a DRAFT invoice (no number, no accounting yet).
 * Totals are computed server-side only.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const parsed = invoiceCreateSchema.parse(body);

    const invoice = await InvoiceService.createDraft(parsed, actorFromSession(session));
    return successResponse(invoice, 201);
  } catch (error) {
    return handleAccountingError(error);
  }
}
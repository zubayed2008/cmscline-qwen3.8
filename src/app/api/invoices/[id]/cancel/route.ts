import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { InvoiceService } from '@/services/accounting/invoice-service';
import { actorFromSession, handleAccountingError } from '@/utils/accounting-route';
import { invoiceActionSchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/invoices/[id]/cancel - DRAFT -> CANCELLED (only pre-issue;
 * nothing financial has been recorded yet, so no reversing is needed).
 * Body: { reason? }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = invoiceActionSchema.parse(body ?? {});

    const invoice = await InvoiceService.cancel(id, actorFromSession(session));
    return successResponse({ invoice, reason: parsed.reason ?? null });
  } catch (error) {
    return handleAccountingError(error);
  }
}
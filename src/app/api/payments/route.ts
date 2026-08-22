import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { PaymentService } from '@/services/accounting/payment-service';
import { actorFromSession, handleAccountingError, withIdempotency } from '@/utils/accounting-route';
import { paymentCreateSchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';

/**
 * GET /api/payments - payment list newest-first.
 */
export async function GET() {
  try {
    await requireAdmin();
    return successResponse(await PaymentService.listPayments());
  } catch (error) {
    return handleAccountingError(error);
  }
}

/**
 * POST /api/payments (idempotent) - records a customer payment with optional
 * allocations and books Dr Cash / Cr AR atomically. When no allocations are
 * given, open invoices are consumed FIFO by due date.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const parsed = paymentCreateSchema.parse(body);
    const actor = actorFromSession(session);

    return await withIdempotency(
      request,
      '/api/payments',
      { action: 'payment', ...parsed },
      (tx) => PaymentService.recordCustomerPayment(parsed, actor, tx),
      () => 201
    );
  } catch (error) {
    return handleAccountingError(error);
  }
}
import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { PaymentService } from '@/services/accounting/payment-service';
import { actorFromSession, handleAccountingError, withIdempotency } from '@/utils/accounting-route';
import { paymentCreateSchema, vendorPaymentCreateSchema } from '@/types/accounting-schemas';
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
 * POST /api/payments (idempotent) - records a customer OR vendor payment with
 * optional allocations and books the cash JE atomically.
 *
 * Customer: { customerId, ..., allocations:[{ invoiceId, amount }] }
 *   books Dr Cash / Cr AR (FIFO across open invoices when omitted).
 * Vendor:   { vendorId, ..., allocations:[{ billId, amount }] }
 *   books Dr AP / Cr Cash (FIFO across posted bills when omitted).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const actor = actorFromSession(session);

    const isVendor = body?.paymentType === 'VENDOR' || Boolean(body?.vendorId);
    if (isVendor) {
      const parsed = vendorPaymentCreateSchema.parse(body);
      return await withIdempotency(
        request,
        '/api/payments',
        { action: 'vendorPayment', ...parsed },
        (tx) => PaymentService.recordVendorPayment(parsed, actor, tx),
        () => 201
      );
    }

    const parsed = paymentCreateSchema.parse(body);
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
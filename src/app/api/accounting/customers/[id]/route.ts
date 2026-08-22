import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { CustomerService } from '@/services/accounting/customer-service';
import { customerUpdateSchema } from '@/types/accounting-schemas';
import { errorResponse, successResponse } from '@/utils/api-response';
import { handleAccountingError } from '@/utils/accounting-route';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/accounting/customers/[id]?statement=true
 * Single customer, or full statement (all invoices + total balance due).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const statement = new URL(request.url).searchParams.get('statement') === 'true';
    if (statement) return successResponse(await CustomerService.getCustomerStatement(id));
    return successResponse(await CustomerService.getById(id));
  } catch (error) {
    return handleAccountingError(error);
  }
}

/**
 * PATCH /api/accounting/customers/[id] - updates fields/status.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = customerUpdateSchema.parse(body);
    return successResponse(await CustomerService.updateCustomer(id, parsed));
  } catch (error) {
    return handleAccountingError(error);
  }
}
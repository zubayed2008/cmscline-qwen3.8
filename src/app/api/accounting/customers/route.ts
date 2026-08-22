import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { CustomerService } from '@/services/accounting/customer-service';
import { customerCreateSchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';
import { actorFromSession, handleAccountingError } from '@/utils/accounting-route';

/**
 * GET /api/accounting/customers - customer list ordered by name.
 */
export async function GET() {
  try {
    await requireAdmin();
    return successResponse(await CustomerService.listCustomers());
  } catch (error) {
    return handleAccountingError(error);
  }
}

/**
 * POST /api/accounting/customers - creates a customer with a generated code.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const parsed = customerCreateSchema.parse(body);

    const customer = await CustomerService.createCustomer({
      ...parsed,
      createdByName: session.user.name ?? null,
    });
    return successResponse(customer, 201);
  } catch (error) {
    return handleAccountingError(error);
  }
}
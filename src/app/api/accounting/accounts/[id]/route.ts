import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { AccountService } from '@/services/accounting/account-service';
import { accountUpdateSchema } from '@/types/accounting-schemas';
import { errorResponse, successResponse } from '@/utils/api-response';
import { handleAccountingError } from '@/utils/accounting-route';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/accounting/accounts/[id] - single account.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const account = (await AccountService.listAccounts()).find((a) => a.id === id);
    if (!account) return errorResponse('Account not found', 404);
    return successResponse(account);
  } catch (error) {
    return handleAccountingError(error);
  }
}

/**
 * PATCH /api/accounting/accounts/[id] - updates fields, or toggles
 * isActive (deactivate keeps the postings guard; reactivation re-enables).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = accountUpdateSchema.parse(body);

    if (parsed.isActive === false) {
      return successResponse(await AccountService.deactivateAccount(id));
    }
    if (parsed.isActive === true) {
      return successResponse(await AccountService.setAccountActive(id, true));
    }

    const { isActive: _ignored, ...rest } = parsed;
    return successResponse(await AccountService.updateAccount(id, rest));
  } catch (error) {
    return handleAccountingError(error);
  }
}
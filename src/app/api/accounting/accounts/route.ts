import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { AccountService } from '@/services/accounting/account-service';
import { accountCreateSchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';
import { actorFromSession, handleAccountingError } from '@/utils/accounting-route';

/**
 * GET /api/accounting/accounts - flat chart ordered by code (Admin).
 */
export async function GET() {
  try {
    await requireAdmin();
    const accounts = await AccountService.listAccounts();
    return successResponse(accounts);
  } catch (error) {
    return handleAccountingError(error);
  }
}

/**
 * POST /api/accounting/accounts - creates an account.
 * Normal balance is derived from type server-side (spec §2.2).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const parsed = accountCreateSchema.parse(body);

    const account = await AccountService.createAccount({
      ...parsed,
      createdByName: session.user.name ?? null,
    });
    return successResponse(account, 201);
  } catch (error) {
    return handleAccountingError(error);
  }
}
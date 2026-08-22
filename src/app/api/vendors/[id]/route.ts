import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { VendorService } from '@/services/accounting/vendor-service';
import { vendorUpdateSchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';
import { handleAccountingError } from '@/utils/accounting-route';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/vendors/[id]?statement=true
 * Single vendor, or full statement (all bills + total balance due).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const statement = new URL(request.url).searchParams.get('statement') === 'true';
    if (statement) return successResponse(await VendorService.getVendorStatement(id));
    return successResponse(await VendorService.getById(id));
  } catch (error) {
    return handleAccountingError(error);
  }
}

/**
 * PATCH /api/vendors/[id] - updates fields/status.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = vendorUpdateSchema.parse(body);
    return successResponse(await VendorService.updateVendor(id, parsed));
  } catch (error) {
    return handleAccountingError(error);
  }
}

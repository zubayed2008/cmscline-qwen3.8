import { NextRequest } from 'next/server';
import { requireAdmin } from '@/utils/auth';
import { VendorService } from '@/services/accounting/vendor-service';
import { vendorCreateSchema } from '@/types/accounting-schemas';
import { successResponse } from '@/utils/api-response';
import { handleAccountingError } from '@/utils/accounting-route';

/**
 * GET /api/vendors - vendor list ordered by name.
 */
export async function GET() {
  try {
    await requireAdmin();
    return successResponse(await VendorService.listVendors());
  } catch (error) {
    return handleAccountingError(error);
  }
}

/**
 * POST /api/vendors - creates a vendor with a generated code.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const parsed = vendorCreateSchema.parse(body);

    const vendor = await VendorService.createVendor({
      ...parsed,
      createdByName: session.user.name ?? null,
    });
    return successResponse(vendor, 201);
  } catch (error) {
    return handleAccountingError(error);
  }
}

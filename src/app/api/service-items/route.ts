import { NextRequest } from 'next/server';
import { ServiceItemService } from '@/services/service-item-service';
import { createServiceItemSchema } from '@/types/schemas';
import { requireAuth } from '@/utils/auth';
import { successResponse, handleError } from '@/utils/api-response';

/**
 * GET /api/service-items
 * Returns all service items for admin, or active items for public (with ?active=true).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    if (activeOnly) {
      // Public endpoint: no auth required
      const items = await ServiceItemService.getActiveServiceItems();
      return successResponse(items);
    }

    // Admin endpoint: auth required
    await requireAuth();
    const items = await ServiceItemService.getAllServiceItems();
    return successResponse(items);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/service-items
 * Creates a new service item. Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const validatedData = createServiceItemSchema.parse(body);

    const item = await ServiceItemService.createServiceItem(validatedData);
    return successResponse(item, 201);
  } catch (error) {
    return handleError(error);
  }
}

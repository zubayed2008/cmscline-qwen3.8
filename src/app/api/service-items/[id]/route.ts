import { NextRequest } from 'next/server';
import { ServiceItemService } from '@/services/service-item-service';
import { updateServiceItemSchema } from '@/types/schemas';
import { requireAuth } from '@/utils/auth';
import { successResponse, errorResponse, handleError } from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/service-items/[id]
 * Gets a service item by ID. Requires authentication.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const item = await ServiceItemService.getServiceItemById(id);

    if (!item) {
      return errorResponse('Service item not found', 404);
    }

    return successResponse(item);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/service-items/[id]
 * Updates a service item by ID. Requires authentication.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateServiceItemSchema.parse(body);

    const item = await ServiceItemService.updateServiceItem(id, validatedData);

    if (!item) {
      return errorResponse('Service item not found', 404);
    }

    return successResponse(item);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/service-items/[id]
 * Deletes a service item by ID. Requires authentication.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const item = await ServiceItemService.deleteServiceItem(id);

    if (!item) {
      return errorResponse('Service item not found', 404);
    }

    return successResponse({ message: 'Service item deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}

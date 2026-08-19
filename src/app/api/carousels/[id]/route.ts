import { NextRequest } from 'next/server';
import { CarouselService } from '@/services/carousel-service';
import { updateCarouselItemSchema } from '@/types/schemas';
import { requireAuth } from '@/utils/auth';
import { successResponse, errorResponse, handleValidationError, handleError } from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/carousels/[id]
 * Gets a carousel item by ID. Requires authentication.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const item = await CarouselService.getCarouselItemById(id);

    if (!item) {
      return errorResponse('Carousel item not found', 404);
    }

    return successResponse(item);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/carousels/[id]
 * Updates a carousel item by ID. Requires authentication.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateCarouselItemSchema.parse(body);

    const item = await CarouselService.updateCarouselItem(id, validatedData);

    if (!item) {
      return errorResponse('Carousel item not found', 404);
    }

    return successResponse(item);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return handleValidationError(error);
  }
}

/**
 * DELETE /api/carousels/[id]
 * Deletes a carousel item by ID. Requires authentication.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const item = await CarouselService.deleteCarouselItem(id);

    if (!item) {
      return errorResponse('Carousel item not found', 404);
    }

    return successResponse({ message: 'Carousel item deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}
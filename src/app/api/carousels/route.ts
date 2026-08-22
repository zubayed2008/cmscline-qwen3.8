import { NextRequest } from 'next/server';
import { CarouselService } from '@/services/carousel-service';
import { createCarouselItemSchema, reorderCarouselItemsSchema } from '@/types/schemas';
import { requireAuth } from '@/utils/auth';
import { successResponse, handleError } from '@/utils/api-response';
import { CarouselType } from '@/models/carousel-item-model';

/**
 * GET /api/carousels
 * Returns all carousel items for admin, or active items for public (with ?active=true).
 * Supports filtering by type with ?type=hero.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const type = searchParams.get('type') as CarouselType | null;

    const validTypes: CarouselType[] = ['hero', 'client', 'employee', 'recommendation'];

    if (activeOnly) {
      // Public endpoint: no auth required
      if (type && validTypes.includes(type)) {
        const items = await CarouselService.getActiveCarouselItemsByType(type);
        return successResponse(items);
      }
      const items = await CarouselService.getActiveCarouselItems();
      return successResponse(items);
    }

    // Admin endpoint: auth required
    await requireAuth();
    if (type && validTypes.includes(type)) {
      const items = await CarouselService.getCarouselItemsByType(type);
      return successResponse(items);
    }
    const items = await CarouselService.getAllCarouselItems();
    return successResponse(items);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/carousels
 * Creates a new carousel item. Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const validatedData = createCarouselItemSchema.parse(body);

    const item = await CarouselService.createCarouselItem(validatedData);
    return successResponse(item, 201);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/carousels
 * Reorders carousel items. Requires authentication.
 * Body: { type: 'hero', items: [{ id: '...', order: 0 }, ...] }
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const validatedData = reorderCarouselItemsSchema.parse(body);

    await CarouselService.reorderCarouselItems(validatedData.type, validatedData.items);
    return successResponse({ message: 'Carousel items reordered successfully' });
  } catch (error) {
    return handleError(error);
  }
}

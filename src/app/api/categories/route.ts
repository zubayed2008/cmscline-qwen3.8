import { NextRequest } from 'next/server';
import { CategoryService } from '@/services/taxonomy-service';
import { createTaxonomySchema } from '@/types/schemas';
import { requireAuth } from '@/utils/auth';
import {
  successResponse,
  errorResponse,
  handleValidationError,
  handleError,
} from '@/utils/api-response';

/**
 * GET /api/categories
 * Returns all categories for admin, or active categories for public (with ?active=true).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    if (activeOnly) {
      // Public endpoint: no auth required
      const categories = await CategoryService.getActiveCategories();
      return successResponse(categories);
    }

    // Admin endpoint: auth required
    await requireAuth();
    const categories = await CategoryService.getAllCategories();
    return successResponse(categories);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/categories
 * Creates a new category. Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const validatedData = createTaxonomySchema.parse(body);

    const category = await CategoryService.createCategory(validatedData);
    return successResponse(category, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return handleValidationError(error);
  }
}

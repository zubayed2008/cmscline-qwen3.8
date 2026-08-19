import { NextRequest } from 'next/server';
import { CategoryService } from '@/services/taxonomy-service';
import { updateTaxonomySchema } from '@/types/schemas';
import { requireAuth } from '@/utils/auth';
import { successResponse, errorResponse, handleValidationError, handleError } from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/categories/[id]
 * Gets a category by ID. Requires authentication.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const category = await CategoryService.getCategoryById(id);

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    return successResponse(category);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/categories/[id]
 * Updates a category by ID. Requires authentication.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateTaxonomySchema.parse(body);

    const category = await CategoryService.updateCategory(id, validatedData);

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    return successResponse(category);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return handleValidationError(error);
  }
}

/**
 * DELETE /api/categories/[id]
 * Deletes a category by ID. Requires authentication.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const category = await CategoryService.deleteCategory(id);

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    return successResponse({ message: 'Category deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}
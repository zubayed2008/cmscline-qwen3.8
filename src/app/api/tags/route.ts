import { NextRequest } from 'next/server';
import { TagService } from '@/services/taxonomy-service';
import { createTaxonomySchema } from '@/types/schemas';
import { requireAuth } from '@/utils/auth';
import { successResponse, errorResponse, handleValidationError, handleError } from '@/utils/api-response';

/**
 * GET /api/tags
 * Returns all tags for admin, or active tags for public (with ?active=true).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    if (activeOnly) {
      // Public endpoint: no auth required
      const tags = await TagService.getActiveTags();
      return successResponse(tags);
    }

    // Admin endpoint: auth required
    await requireAuth();
    const tags = await TagService.getAllTags();
    return successResponse(tags);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/tags
 * Creates a new tag. Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const validatedData = createTaxonomySchema.parse(body);

    const tag = await TagService.createTag(validatedData);
    return successResponse(tag, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return handleValidationError(error);
  }
}
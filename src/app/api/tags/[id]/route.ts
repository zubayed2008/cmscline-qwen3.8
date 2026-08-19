import { NextRequest } from 'next/server';
import { TagService } from '@/services/taxonomy-service';
import { updateTaxonomySchema } from '@/types/schemas';
import { requireAuth } from '@/utils/auth';
import {
  successResponse,
  errorResponse,
  handleValidationError,
  handleError,
} from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tags/[id]
 * Gets a tag by ID. Requires authentication.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const tag = await TagService.getTagById(id);

    if (!tag) {
      return errorResponse('Tag not found', 404);
    }

    return successResponse(tag);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/tags/[id]
 * Updates a tag by ID. Requires authentication.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateTaxonomySchema.parse(body);

    const tag = await TagService.updateTag(id, validatedData);

    if (!tag) {
      return errorResponse('Tag not found', 404);
    }

    return successResponse(tag);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return handleValidationError(error);
  }
}

/**
 * DELETE /api/tags/[id]
 * Deletes a tag by ID. Requires authentication.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const tag = await TagService.deleteTag(id);

    if (!tag) {
      return errorResponse('Tag not found', 404);
    }

    return successResponse({ message: 'Tag deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}

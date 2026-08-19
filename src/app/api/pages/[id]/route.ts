import { NextRequest } from 'next/server';
import { PageService } from '@/services/page-service';
import { updatePageSchema } from '@/types/schemas';
import { requireAdmin } from '@/utils/auth';
import { successResponse, errorResponse, handleValidationError, handleError } from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pages/[id]
 * Gets a page by ID. Requires authentication.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const page = await PageService.getPageById(id);

    if (!page) {
      return errorResponse('Page not found', 404);
    }

    return successResponse(page);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/pages/[id]
 * Updates a page by ID. Requires authentication.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const validatedData = updatePageSchema.parse(body);

    const page = await PageService.updatePage(id, validatedData);

    if (!page) {
      return errorResponse('Page not found', 404);
    }

    return successResponse(page);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return errorResponse('Unauthorized', 401);
      }
      if (error.message === 'Forbidden: Admin access required') {
        return errorResponse('Forbidden: Admin access required', 403);
      }
    }
    return handleValidationError(error);
  }
}

/**
 * DELETE /api/pages/[id]
 * Deletes a page by ID. Requires authentication.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const page = await PageService.deletePage(id);

    if (!page) {
      return errorResponse('Page not found', 404);
    }

    return successResponse({ message: 'Page deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}
import { NextRequest } from 'next/server';
import { PageService } from '@/services/page-service';
import { createPageSchema } from '@/types/schemas';
import { requireAdmin } from '@/utils/auth';
import { successResponse, errorResponse, handleValidationError, handleError } from '@/utils/api-response';

/**
 * GET /api/pages
 * Returns all pages for admin, or active pages for public (with ?active=true).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    if (activeOnly) {
      // Public endpoint: no auth required
      const pages = await PageService.getActivePages();
      return successResponse(pages);
    }

    // Admin endpoint: Admin role required
    await requireAdmin();
    const pages = await PageService.getAllPages();
    return successResponse(pages);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/pages
 * Creates a new page. Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validatedData = createPageSchema.parse(body);

    const page = await PageService.createPage(validatedData);
    return successResponse(page, 201);
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
import { NextRequest } from 'next/server';
import { NavigationService } from '@/services/navigation-service';
import { updateNavigationMenuSchema } from '@/types/schemas';
import { requireAdmin } from '@/utils/auth';
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
 * GET /api/navigation-menus/[id]
 * Gets a navigation menu by ID. Requires authentication.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const menu = await NavigationService.getNavigationMenuById(id);

    if (!menu) {
      return errorResponse('Navigation menu not found', 404);
    }

    return successResponse(menu);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/navigation-menus/[id]
 * Updates a navigation menu by ID. Requires authentication.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateNavigationMenuSchema.parse(body);

    const menu = await NavigationService.updateNavigationMenu(id, validatedData);

    if (!menu) {
      return errorResponse('Navigation menu not found', 404);
    }

    return successResponse(menu);
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
 * DELETE /api/navigation-menus/[id]
 * Deletes a navigation menu by ID. Requires authentication.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const menu = await NavigationService.deleteNavigationMenu(id);

    if (!menu) {
      return errorResponse('Navigation menu not found', 404);
    }

    return successResponse({ message: 'Navigation menu deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}

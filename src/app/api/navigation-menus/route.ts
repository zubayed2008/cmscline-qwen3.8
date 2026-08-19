import { NextRequest } from 'next/server';
import { NavigationService } from '@/services/navigation-service';
import { createNavigationMenuSchema } from '@/types/schemas';
import { requireAdmin } from '@/utils/auth';
import { successResponse, errorResponse, handleValidationError, handleError } from '@/utils/api-response';

/**
 * GET /api/navigation-menus
 * Returns all navigation menus for admin, or active menus for public (with ?active=true).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const getDefault = searchParams.get('default') === 'true';

    if (activeOnly || getDefault) {
      // Public endpoint: no auth required
      if (getDefault) {
        const menu = await NavigationService.getDefaultNavigationMenu();
        if (!menu) {
          return errorResponse('No default navigation menu found', 404);
        }
        return successResponse(menu);
      }
      const menus = await NavigationService.getActiveNavigationMenus();
      return successResponse(menus);
    }

    // Admin endpoint: Admin role required
    await requireAdmin();
    const menus = await NavigationService.getAllNavigationMenus();
    return successResponse(menus);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/navigation-menus
 * Creates a new navigation menu. Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validatedData = createNavigationMenuSchema.parse(body);

    const menu = await NavigationService.createNavigationMenu(validatedData);
    return successResponse(menu, 201);
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
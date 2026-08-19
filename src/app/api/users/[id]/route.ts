import { NextRequest } from 'next/server';
import { UserService } from '@/services/user-service';
import { updateUserSchema } from '@/types/schemas';
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
 * GET /api/users/[id]
 * Gets a user by ID. Requires Admin role.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const user = await UserService.getUserById(id);

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse(UserService.sanitizeUser(user));
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/users/[id]
 * Updates a user by ID. Requires Admin role.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    const user = await UserService.updateUser(id, validatedData);

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse(UserService.sanitizeUser(user));
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
 * DELETE /api/users/[id]
 * Deletes a user by ID. Requires Admin role.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const user = await UserService.deleteUser(id);

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse({ message: 'User deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}

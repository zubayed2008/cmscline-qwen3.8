import { NextRequest } from 'next/server';
import { UserService } from '@/services/user-service';
import { createUserSchema } from '@/types/schemas';
import { requireAdmin } from '@/utils/auth';
import { successResponse, errorResponse, handleValidationError, handleError } from '@/utils/api-response';

/**
 * GET /api/users
 * Returns all users. Requires Admin role.
 */
export async function GET() {
  try {
    await requireAdmin();

    const users = await UserService.getAllUsers();
    // Sanitize users to remove passwordHash
    const sanitizedUsers = users.map((user) => UserService.sanitizeUser(user));
    return successResponse(sanitizedUsers);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/users
 * Creates a new user. Requires Admin role.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    const user = await UserService.createUser(validatedData);
    return successResponse(UserService.sanitizeUser(user), 201);
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
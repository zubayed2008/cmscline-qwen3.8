import { NextRequest } from 'next/server';
import { UserService } from '@/services/user-service';
import { updateProfileSchema } from '@/types/schemas';
import { requireAuth } from '@/utils/auth';
import { sendAccountNotificationEmail } from '@/utils/email';
import {
  successResponse,
  errorResponse,
  handleValidationError,
  handleError,
} from '@/utils/api-response';

/**
 * GET /api/auth/profile
 * Returns the current user's profile.
 */
export async function GET() {
  try {
    const session = await requireAuth();

    const user = await UserService.getUserById(session.user.id);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse(UserService.sanitizeUser(user));
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/auth/profile
 * Updates the current user's profile (name, email, password, profile image).
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    const user = await UserService.updateProfile(session.user.id, validatedData);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Send notification email if email or password changed
    if (validatedData.email || validatedData.newPassword) {
      await sendAccountNotificationEmail(
        user.email,
        user.name,
        'Your account details have been updated.'
      );
    }

    return successResponse(UserService.sanitizeUser(user));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return errorResponse('Unauthorized', 401);
      }
      if (
        error.message === 'Current password is required to change email' ||
        error.message === 'Current password is required to change password' ||
        error.message === 'Current password is incorrect'
      ) {
        return errorResponse(error.message, 400);
      }
    }
    return handleValidationError(error);
  }
}
import { NextRequest } from 'next/server';
import { UserService } from '@/services/user-service';
import { resetPasswordSchema } from '@/types/schemas';
import {
  successResponse,
  errorResponse,
  handleValidationError,
} from '@/utils/api-response';

/**
 * POST /api/auth/reset-password
 * Resets a user's password using the token from the reset email.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);

    const reset = await UserService.resetPassword(
      validatedData.token,
      validatedData.password
    );

    if (!reset) {
      return errorResponse('Invalid or expired reset token', 400);
    }

    return successResponse({ message: 'Password reset successfully' });
  } catch (error) {
    return handleValidationError(error);
  }
}
import { NextRequest } from 'next/server';
import { UserService } from '@/services/user-service';
import { verifyEmailSchema } from '@/types/schemas';
import {
  successResponse,
  errorResponse,
  handleValidationError,
} from '@/utils/api-response';

/**
 * POST /api/auth/verify-email
 * Verifies a user's email address using the token from the email link.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = verifyEmailSchema.parse(body);

    const verified = await UserService.verifyEmail(validatedData.token);

    if (!verified) {
      return errorResponse('Invalid or expired verification token', 400);
    }

    return successResponse({ message: 'Email verified successfully' });
  } catch (error) {
    return handleValidationError(error);
  }
}
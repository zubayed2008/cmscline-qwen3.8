import { NextRequest } from 'next/server';
import { UserService } from '@/services/user-service';
import { forgotPasswordSchema } from '@/types/schemas';
import { sendPasswordResetEmail } from '@/utils/email';
import {
  successResponse,
  handleValidationError,
} from '@/utils/api-response';

/**
 * POST /api/auth/forgot-password
 * Generates a password reset token and sends a reset email.
 * Always returns success to prevent user enumeration.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = forgotPasswordSchema.parse(body);

    const token = await UserService.generatePasswordResetToken(validatedData.email);

    if (token) {
      const user = await UserService.getUserByEmail(validatedData.email);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const resetUrl = `${siteUrl}/reset-password?token=${token}`;

      if (user) {
        await sendPasswordResetEmail(user.email, user.name, resetUrl);
      }
    }

    // Always return success to prevent user enumeration
    return successResponse({
      message: 'If an account exists with that email, a password reset link has been sent.',
    });
  } catch (error) {
    return handleValidationError(error);
  }
}
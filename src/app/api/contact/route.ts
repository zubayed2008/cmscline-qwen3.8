import { NextRequest } from 'next/server';
import { ContactService } from '@/services/contact-service';
import { createContactSubmissionSchema } from '@/types/schemas';
import { verifyCaptcha } from '@/utils/captcha';
import {
  successResponse,
  errorResponse,
  handleValidationError,
  handleError,
} from '@/utils/api-response';

/**
 * POST /api/contact
 * Public endpoint for contact form submissions.
 * Verifies CAPTCHA token before saving to database.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createContactSubmissionSchema.parse(body);

    // Verify CAPTCHA token server-side
    const captchaResult = await verifyCaptcha(validatedData.captchaToken);

    if (!captchaResult.success) {
      return errorResponse(captchaResult.error || 'CAPTCHA verification failed', 400);
    }

    // Create submission with CAPTCHA score
    const submission = await ContactService.createSubmission({
      name: validatedData.name,
      email: validatedData.email,
      message: validatedData.message,
      captchaScore: captchaResult.score,
    });

    return successResponse(
      {
        message: 'Contact form submitted successfully',
        id: submission._id,
      },
      201
    );
  } catch (error) {
    return handleValidationError(error);
  }
}

/**
 * GET /api/contact
 * Returns all contact submissions. Requires authentication.
 * Supports ?unread=true to get only unread submissions.
 */
export async function GET(request: NextRequest) {
  try {
    // Import requireAuth dynamically to avoid issues
    const { requireAuth } = await import('@/utils/auth');
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    if (unreadOnly) {
      const submissions = await ContactService.getUnreadSubmissions();
      return successResponse(submissions);
    }

    const submissions = await ContactService.getAllSubmissions();
    return successResponse(submissions);
  } catch (error) {
    return handleError(error);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ContactService } from '@/services/contact-service';
import { createContactSubmissionSchema } from '@/types/schemas';
import { verifyCaptcha } from '@/utils/captcha';
import {
  successResponse,
  errorResponse,
  handleValidationError,
  handleError,
} from '@/utils/api-response';
import { rateLimit, RATE_LIMIT_CONFIG } from '@/utils/rate-limit';

/**
 * POST /api/contact
 * Public endpoint for contact form submissions.
 * Verifies CAPTCHA token before saving to database.
 * Rate limited to 5 submissions per hour per IP.
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    // Apply contact form rate limiting
    const { success, remaining } = await rateLimit(
      `contact:${ip}`,
      RATE_LIMIT_CONFIG.CONTACT_FORM.limit,
      RATE_LIMIT_CONFIG.CONTACT_FORM.window
    );

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many contact form submissions. Please try again later.',
          retryAfter: Math.ceil(RATE_LIMIT_CONFIG.CONTACT_FORM.window / 60000),
        },
        { status: 429 }
      );
    }

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
        rateLimit: { remaining },
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

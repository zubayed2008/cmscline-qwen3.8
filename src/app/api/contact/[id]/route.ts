import { NextRequest } from 'next/server';
import { ContactService } from '@/services/contact-service';
import { requireAuth } from '@/utils/auth';
import { successResponse, errorResponse, handleError } from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/contact/[id]
 * Gets a contact submission by ID. Requires authentication.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const submission = await ContactService.getSubmissionById(id);

    if (!submission) {
      return errorResponse('Contact submission not found', 404);
    }

    return successResponse(submission);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/contact/[id]
 * Toggles the read status of a contact submission. Requires authentication.
 * Body: { isRead: boolean } or empty to toggle.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    let submission;
    if (typeof body.isRead === 'boolean') {
      submission = body.isRead
        ? await ContactService.markAsRead(id)
        : await ContactService.markAsUnread(id);
    } else {
      submission = await ContactService.toggleReadStatus(id);
    }

    if (!submission) {
      return errorResponse('Contact submission not found', 404);
    }

    return successResponse(submission);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/contact/[id]
 * Deletes a contact submission by ID. Requires authentication.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const submission = await ContactService.deleteSubmission(id);

    if (!submission) {
      return errorResponse('Contact submission not found', 404);
    }

    return successResponse({ message: 'Contact submission deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}
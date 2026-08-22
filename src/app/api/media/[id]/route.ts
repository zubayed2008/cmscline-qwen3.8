import { NextRequest } from 'next/server';
import { MediaService } from '@/services/media-service';
import { updateMediaSchema } from '@/types/schemas';
import { requireAuth } from '@/utils/auth';
import { successResponse, errorResponse, handleError } from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/media/[id]
 * Gets a media record by ID. Requires authentication.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const media = await MediaService.getMediaById(id);

    if (!media) {
      return errorResponse('Media not found', 404);
    }

    return successResponse(media);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/media/[id]
 * Updates a media record by ID. Requires authentication.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateMediaSchema.parse(body);

    const media = await MediaService.updateMedia(id, validatedData);

    if (!media) {
      return errorResponse('Media not found', 404);
    }

    return successResponse(media);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/media/[id]
 * Deletes a media record by ID. Requires authentication.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const media = await MediaService.deleteMedia(id);

    if (!media) {
      return errorResponse('Media not found', 404);
    }

    return successResponse({ message: 'Media deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}

import { NextRequest } from 'next/server';
import { MediaService } from '@/services/media-service';
import { createMediaSchema } from '@/types/schemas';
import { requireAuth } from '@/utils/auth';
import {
  successResponse,
  errorResponse,
  handleValidationError,
  handleError,
} from '@/utils/api-response';

/**
 * GET /api/media
 * Returns all media for admin, or active media for public (with ?active=true).
 * Supports filtering by MIME type with ?mimeType=image.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const mimeType = searchParams.get('mimeType');

    if (activeOnly) {
      // Public endpoint: no auth required
      if (mimeType) {
        const media = await MediaService.getMediaByMimeType(mimeType);
        return successResponse(media);
      }
      const media = await MediaService.getActiveMedia();
      return successResponse(media);
    }

    // Admin endpoint: auth required
    await requireAuth();
    const media = await MediaService.getAllMedia();
    return successResponse(media);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/media
 * Creates a new media record. Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const validatedData = createMediaSchema.parse(body);

    const media = await MediaService.createMedia(validatedData);
    return successResponse(media, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return handleValidationError(error);
  }
}

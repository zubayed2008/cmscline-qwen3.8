import { NextRequest } from 'next/server';
import { MediaService, MAX_FILE_SIZE, isValidFileExtension, isValidMimeType } from '@/services/media-service';
import { requireAuth } from '@/utils/auth';
import { successResponse, errorResponse, handleError } from '@/utils/api-response';

/**
 * POST /api/media/upload
 * Handles file upload via multipart/form-data.
 * Requires authentication.
 *
 * Form fields:
 * - file: The image file (required)
 * - altText: Alternative text for the image (optional)
 * - caption: Caption for the image (optional)
 * - isActive: Whether the media is active (optional, default: true)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const altText = formData.get('altText') as string | null;
    const caption = formData.get('caption') as string | null;
    const isActiveStr = formData.get('isActive') as string | null;
    const isActive = isActiveStr !== 'false';

    // Validate file exists
    if (!file) {
      return errorResponse('No file provided', 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(
        `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        400
      );
    }

    // Validate file extension
    if (!isValidFileExtension(file.name)) {
      return errorResponse(
        `Invalid file extension. Allowed extensions: jpg, jpeg, png, webp, gif`,
        400
      );
    }

    // Validate MIME type
    if (!isValidMimeType(file.type)) {
      return errorResponse(
        `Invalid MIME type. Allowed types: image/jpeg, image/png, image/webp, image/gif`,
        400
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Upload and create media record
    const media = await MediaService.uploadMedia({
      fileBuffer,
      filename: file.name,
      mimeType: file.type,
      altText: altText || undefined,
      caption: caption || undefined,
      isActive,
    });

    return successResponse(media, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return handleError(error);
  }
}
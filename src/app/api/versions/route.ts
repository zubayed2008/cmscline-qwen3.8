import { NextRequest } from 'next/server';
import { VersionService } from '@/services/version-service';
import { createContentVersionSchema, listVersionsQuerySchema } from '@/types/schemas';
import { requireAdmin } from '@/utils/auth';
import {
  successResponse,
  errorResponse,
  handleValidationError,
  handleError,
} from '@/utils/api-response';

/**
 * GET /api/versions?contentType=page|blog&contentId=<id>
 * Lists the version history for a Page or Blog. Requires Admin role.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const query = listVersionsQuerySchema.parse({
      contentType: searchParams.get('contentType') ?? undefined,
      contentId: searchParams.get('contentId') ?? undefined,
    });

    const versions = await VersionService.getVersions(query.contentType, query.contentId);
    return successResponse(versions);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid content ID')) {
      return errorResponse(error.message, 400);
    }
    return handleError(error);
  }
}

/**
 * POST /api/versions
 * Manually creates a version snapshot for a Page or Blog.
 * Useful for checkpointing before bulk edits. Requires Admin role.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();

    const body = await request.json();
    const validatedData = createContentVersionSchema.parse(body);

    const version = await VersionService.createVersion({
      ...validatedData,
      changedBy: session.user.id,
      changeSummary: validatedData.changeSummary ?? 'Manual snapshot',
    });

    return successResponse(version, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return errorResponse('Unauthorized', 401);
      }
      if (error.message === 'Forbidden: Admin access required') {
        return errorResponse('Forbidden: Admin access required', 403);
      }
      if (error.message.startsWith('changedBy is required')) {
        return errorResponse(error.message, 400);
      }
    }
    return handleValidationError(error);
  }
}
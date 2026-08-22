import { NextRequest } from 'next/server';
import { VersionService } from '@/services/version-service';
import { restoreVersionSchema } from '@/types/schemas';
import { requireAdmin } from '@/utils/auth';
import { successResponse, errorResponse, handleError } from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/versions/[id]
 * Gets a single version by ID. Requires authentication.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const version = await VersionService.getVersionById(id);

    if (!version) {
      return errorResponse('Version not found', 404);
    }

    return successResponse(version);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/versions/[id]
 * Restores the parent Page/Blog to this version's state.
 * The current state is snapshotted first so the restore can be undone.
 * Requires Admin role.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();

    const { id } = await params;

    // Body is optional; may contain a custom changeSummary
    let changeSummary: string | undefined;
    try {
      const body = await request.json();
      const parsed = restoreVersionSchema.parse(body);
      changeSummary = parsed.changeSummary;
    } catch {
      // Empty or invalid body: fall back to default summary
      changeSummary = undefined;
    }

    const restored = await VersionService.restoreVersion(id, {
      restoredBy: session.user.id,
      changeSummary,
    });

    if (!restored) {
      return errorResponse('Version not found', 404);
    }

    return successResponse(restored);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return errorResponse('Unauthorized', 401);
      }
      if (error.message === 'Forbidden: Admin access required') {
        return errorResponse('Forbidden: Admin access required', 403);
      }
      if (error.message.startsWith('restoredBy is required')) {
        return errorResponse(error.message, 400);
      }
      if (
        error.message.includes('no longer exists') ||
        error.message === 'One or both versions not found'
      ) {
        return errorResponse(error.message, 404);
      }
    }
    return handleError(error);
  }
}

/**
 * DELETE /api/versions/[id]
 * Deletes a single version. Requires Admin role.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const { id } = await params;
    const version = await VersionService.deleteVersion(id);

    if (!version) {
      return errorResponse('Version not found', 404);
    }

    return successResponse({ message: 'Version deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}
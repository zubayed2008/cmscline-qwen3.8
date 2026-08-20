import { NextRequest } from 'next/server';
import { SearchService } from '@/services/search-service';
import { searchQuerySchema } from '@/types/schemas';
import { successResponse, handleValidationError } from '@/utils/api-response';

/**
 * GET /api/search?q=query&type=page|blog|all&limit=20&offset=0
 * Public endpoint for full-text search across pages and blogs.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const validated = searchQuerySchema.parse({
      q: searchParams.get('q'),
      type: searchParams.get('type') || 'all',
      limit: searchParams.get('limit') || '20',
      offset: searchParams.get('offset') || '0',
    });

    const result = await SearchService.search(
      validated.q,
      validated.type || 'all',
      validated.limit || 20,
      validated.offset || 0
    );

    return successResponse(result);
  } catch (error) {
    return handleValidationError(error);
  }
}
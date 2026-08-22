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

    // Phase 15.5: localize result titles/excerpts via the NEXT_LOCALE cookie
    const locale = request.cookies.get('NEXT_LOCALE')?.value || 'en';

    const result = await SearchService.search(
      validated.q,
      validated.type || 'all',
      validated.limit || 20,
      validated.offset || 0,
      locale
    );

    return successResponse(result);
  } catch (error) {
    return handleValidationError(error);
  }
}
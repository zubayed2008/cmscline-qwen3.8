import { NextRequest } from 'next/server';
import { BlogService } from '@/services/blog-service';
import { createBlogSchema } from '@/types/schemas';
import { requireAdmin } from '@/utils/auth';
import {
  successResponse,
  errorResponse,
  handleValidationError,
  handleError,
} from '@/utils/api-response';

/**
 * GET /api/blogs
 * Returns all blogs for admin, or active blogs for public (with ?active=true).
 * Supports filtering by category or tag slug for public views.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const categorySlug = searchParams.get('category');
    const tagSlug = searchParams.get('tag');

    if (activeOnly) {
      // Public endpoint: no auth required
      if (categorySlug) {
        const blogs = await BlogService.getBlogsByCategory(categorySlug);
        return successResponse(blogs);
      }
      if (tagSlug) {
        const blogs = await BlogService.getBlogsByTag(tagSlug);
        return successResponse(blogs);
      }
      const blogs = await BlogService.getActiveBlogs();
      return successResponse(blogs);
    }

    // Admin endpoint: Admin role required
    await requireAdmin();
    const blogs = await BlogService.getAllBlogs();
    return successResponse(blogs);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/blogs
 * Creates a new blog. Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validatedData = createBlogSchema.parse(body);

    const blog = await BlogService.createBlog(validatedData);
    return successResponse(blog, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return errorResponse('Unauthorized', 401);
      }
      if (error.message === 'Forbidden: Admin access required') {
        return errorResponse('Forbidden: Admin access required', 403);
      }
    }
    return handleValidationError(error);
  }
}

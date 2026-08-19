import { NextRequest } from 'next/server';
import { BlogService } from '@/services/blog-service';
import { updateBlogSchema } from '@/types/schemas';
import { requireAuth } from '@/utils/auth';
import { successResponse, errorResponse, handleValidationError, handleError } from '@/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/blogs/[id]
 * Gets a blog by ID. Requires authentication for admin view.
 * Public access available with ?active=true for active blogs only.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(request.url);
    const publicAccess = searchParams.get('active') === 'true';
    const { id } = await params;

    if (publicAccess) {
      // Public endpoint: try to get by ID, but only return if active
      const blog = await BlogService.getBlogById(id);
      if (!blog || !blog.isActive) {
        return errorResponse('Blog not found', 404);
      }
      return successResponse(blog);
    }

    await requireAuth();
    const blog = await BlogService.getBlogById(id);

    if (!blog) {
      return errorResponse('Blog not found', 404);
    }

    return successResponse(blog);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/blogs/[id]
 * Updates a blog by ID. Requires authentication.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateBlogSchema.parse(body);

    const blog = await BlogService.updateBlog(id, validatedData);

    if (!blog) {
      return errorResponse('Blog not found', 404);
    }

    return successResponse(blog);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    return handleValidationError(error);
  }
}

/**
 * DELETE /api/blogs/[id]
 * Deletes a blog by ID. Requires authentication.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();

    const { id } = await params;
    const blog = await BlogService.deleteBlog(id);

    if (!blog) {
      return errorResponse('Blog not found', 404);
    }

    return successResponse({ message: 'Blog deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}
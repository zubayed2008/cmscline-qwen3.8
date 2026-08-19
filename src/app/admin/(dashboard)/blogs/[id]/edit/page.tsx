import { notFound } from 'next/navigation';
import BlogService from '@/services/blog-service';
import { CategoryService, TagService } from '@/services/taxonomy-service';
import { requireAdmin } from '@/utils/auth';
import BlogForm from '../../_components/BlogForm';

export const dynamic = 'force-dynamic';

interface EditBlogPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPage({ params }: EditBlogPageProps) {
  await requireAdmin();
  const { id } = await params;

  const [blog, categories, tags] = await Promise.all([
    BlogService.getBlogById(id),
    CategoryService.getAllCategories(),
    TagService.getAllTags(),
  ]);

  if (!blog) {
    notFound();
  }

  // Extract IDs from populated relations
  // After populate(), these may be objects with _id or just ObjectIds
  const categoryId = blog.category ? String((blog.category as { _id?: unknown })._id ?? blog.category) : '';

  const tagIds = (blog.tags || []).map((tag) =>
    String((tag as { _id?: unknown })._id ?? tag)
  );

  const featuredImageId = blog.featuredImage
    ? String((blog.featuredImage as { _id?: unknown })._id ?? blog.featuredImage)
    : '';

  const serializedBlog = {
    _id: blog._id.toString(),
    title: blog.title,
    slug: blog.slug,
    content: blog.content,
    category: categoryId,
    tags: tagIds,
    featuredImage: featuredImageId,
    isActive: blog.isActive,
  };

  const serializedCategories = categories.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
  }));

  const serializedTags = tags.map((t) => ({
    _id: t._id.toString(),
    name: t.name,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Blog</h1>
      <BlogForm
        initialData={serializedBlog}
        categories={serializedCategories}
        tags={serializedTags}
      />
    </div>
  );
}
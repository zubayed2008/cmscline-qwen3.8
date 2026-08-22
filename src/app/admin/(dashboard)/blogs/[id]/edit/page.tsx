import { notFound } from 'next/navigation';
import BlogService from '@/services/blog-service';
import VersionService from '@/services/version-service';
import { CategoryService, TagService } from '@/services/taxonomy-service';
import { requireAdmin } from '@/utils/auth';
import { toTranslationsRecord } from '@/utils/localized-content';
import BlogForm from '../../_components/BlogForm';
import VersionHistory, {
  SerializedVersion,
} from '@/components/features/admin/VersionHistory';

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
  const categoryId = blog.category
    ? String((blog.category as { _id?: unknown })._id ?? blog.category)
    : '';

  const tagIds = (blog.tags || []).map((tag) => String((tag as { _id?: unknown })._id ?? tag));

  const featuredImageId = blog.featuredImage
    ? String((blog.featuredImage as { _id?: unknown })._id ?? blog.featuredImage)
    : '';

  const serializedBlog = {
    _id: blog._id.toString(),
    title: blog.title,
    slug: blog.slug,
    content: blog.content,
    // Phase 15.5: pass per-locale translations to the form (Mongoose Map -> plain object)
    translations: toTranslationsRecord(blog.translations) ?? {},
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

  // Phase 11.1: load version history server-side
  const versions = await VersionService.getVersions('blog', id);
  const serializedVersions: SerializedVersion[] = versions.map((v) => ({
    _id: v._id.toString(),
    version: v.version,
    title: v.title,
    slug: v.slug,
    content: v.content,
    translations: toTranslationsRecord(v.translations) ?? {},
    changeSummary: v.changeSummary,
    changedByName:
      (v.changedBy as unknown as { name?: string; email?: string } | null)?.name ??
      (v.changedBy as unknown as { email?: string } | null)?.email ??
      'Unknown',
    createdAt: v.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Blog</h1>
      <BlogForm
        initialData={serializedBlog}
        categories={serializedCategories}
        tags={serializedTags}
      />
      <VersionHistory
        contentType="blog"
        contentId={serializedBlog._id}
        current={{
          title: serializedBlog.title,
          slug: serializedBlog.slug,
          content: serializedBlog.content,
          translations: serializedBlog.translations,
        }}
        initialVersions={serializedVersions}
      />
    </div>
  );
}

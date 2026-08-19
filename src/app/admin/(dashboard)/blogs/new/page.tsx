import { CategoryService, TagService } from '@/services/taxonomy-service';
import { requireAdmin } from '@/utils/auth';
import BlogForm from '../_components/BlogForm';

export const dynamic = 'force-dynamic';

export default async function NewBlogPage() {
  await requireAdmin();
  const [categories, tags] = await Promise.all([
    CategoryService.getAllCategories(),
    TagService.getAllTags(),
  ]);

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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Blog</h1>
      <BlogForm categories={serializedCategories} tags={serializedTags} />
    </div>
  );
}
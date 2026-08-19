import { notFound } from 'next/navigation';
import { CategoryService } from '@/services/taxonomy-service';
import { requireAdmin } from '@/utils/auth';
import CategoryForm from '../../_components/CategoryForm';

export const dynamic = 'force-dynamic';

interface EditCategoryProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: EditCategoryProps) {
  await requireAdmin();
  const { id } = await params;
  const category = await CategoryService.getCategoryById(id);

  if (!category) {
    notFound();
  }

  const serializedCategory = {
    _id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    isActive: category.isActive,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Category</h1>
      <CategoryForm initialData={serializedCategory} />
    </div>
  );
}
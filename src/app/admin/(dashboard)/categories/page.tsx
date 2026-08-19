import Link from 'next/link';
import { CategoryService } from '@/services/taxonomy-service';
import { requireAdmin } from '@/utils/auth';
import Button from '@/components/ui/Button';
import CategoriesTable from './_components/CategoriesTable';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await CategoryService.getAllCategories();

  // Convert MongoDB documents to plain objects for client component
  const serializedCategories = categories.map((category) => ({
    _id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    isActive: category.isActive,
    createdAt: category.createdAt?.toISOString() ?? '',
    updatedAt: category.updatedAt?.toISOString() ?? '',
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <Link href="/admin/categories/new">
          <Button>Create Category</Button>
        </Link>
      </div>
      <CategoriesTable initialCategories={serializedCategories} />
    </div>
  );
}

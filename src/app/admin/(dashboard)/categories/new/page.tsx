import { requireAdmin } from '@/utils/auth';
import CategoryForm from '../_components/CategoryForm';

export const metadata = {
  title: 'Create Category - Admin',
};

export default async function NewCategoryPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Category</h1>
      <CategoryForm />
    </div>
  );
}
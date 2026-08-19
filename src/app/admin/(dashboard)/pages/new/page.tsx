import { requireAdmin } from '@/utils/auth';
import PageForm from '../_components/PageForm';

export const metadata = {
  title: 'Create Page - Admin',
};

export default async function NewPagePage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Page</h1>
      <PageForm />
    </div>
  );
}
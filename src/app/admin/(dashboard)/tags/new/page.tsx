import { requireAdmin } from '@/utils/auth';
import TagForm from '../_components/TagForm';

export const metadata = {
  title: 'Create Tag - Admin',
};

export default async function NewTagPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Tag</h1>
      <TagForm />
    </div>
  );
}
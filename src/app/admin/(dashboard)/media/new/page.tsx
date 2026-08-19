import { requireAdmin } from '@/utils/auth';
import MediaForm from '../_components/MediaForm';

export const metadata = {
  title: 'Add Media - Admin',
};

export default async function NewMediaPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Media</h1>
      <MediaForm />
    </div>
  );
}

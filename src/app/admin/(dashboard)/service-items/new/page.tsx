import { requireAdmin } from '@/utils/auth';
import ServiceItemForm from '../_components/ServiceItemForm';

export const metadata = {
  title: 'Create Service Item - Admin',
};

export default async function NewServiceItemPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Service Item</h1>
      <ServiceItemForm />
    </div>
  );
}
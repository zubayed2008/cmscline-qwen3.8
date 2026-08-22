import { requireAdmin } from '@/utils/auth';
import VendorForm from '../_components/VendorForm';

export const metadata = {
  title: 'Create Vendor - Admin',
};

export default async function NewVendorPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Vendor</h1>
      <VendorForm />
    </div>
  );
}

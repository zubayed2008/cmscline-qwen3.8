import { requireAdmin } from '@/utils/auth';
import CustomerForm from '../_components/CustomerForm';

export const metadata = {
  title: 'Create Customer - Admin',
};

export default async function NewCustomerPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Customer</h1>
      <CustomerForm />
    </div>
  );
}

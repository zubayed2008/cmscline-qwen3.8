import { requireAdmin } from '@/utils/auth';
import UserForm from '../_components/UserForm';

export const metadata = {
  title: 'Create User - Admin',
};

export default async function NewUserPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create User</h1>
      <UserForm />
    </div>
  );
}
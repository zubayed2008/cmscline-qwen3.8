import { notFound } from 'next/navigation';
import UserService from '@/services/user-service';
import { requireAdmin } from '@/utils/auth';
import UserForm from '../../_components/UserForm';

export const dynamic = 'force-dynamic';

interface EditUserProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: EditUserProps) {
  await requireAdmin();
  const { id } = await params;
  const user = await UserService.getUserById(id);

  if (!user) {
    notFound();
  }

  const serializedUser = {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit User</h1>
      <UserForm initialData={serializedUser} />
    </div>
  );
}
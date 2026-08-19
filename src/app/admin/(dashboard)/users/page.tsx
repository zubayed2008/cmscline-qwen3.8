import Link from 'next/link';
import UserService from '@/services/user-service';
import { requireAdmin } from '@/utils/auth';
import Button from '@/components/ui/Button';
import UsersTable from './_components/UsersTable';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await UserService.getAllUsers();

  // Convert MongoDB documents to plain objects for client component
  const serializedUsers = users.map((user) => ({
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt?.toISOString() ?? '',
    updatedAt: user.updatedAt?.toISOString() ?? '',
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <Link href="/admin/users/new">
          <Button>Create User</Button>
        </Link>
      </div>
      <UsersTable initialUsers={serializedUsers} />
    </div>
  );
}
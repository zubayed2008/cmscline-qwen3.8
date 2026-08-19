'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/features/admin/DataTable';

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UsersTableProps {
  initialUsers: UserData[];
}

export default function UsersTable({ initialUsers }: UsersTableProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>(initialUsers);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setUsers((prev) => prev.map((user) => (user._id === id ? { ...user, isActive } : user)));
      } else {
        alert('Failed to update user status');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsers((prev) => prev.filter((user) => user._id !== id));
        router.refresh();
      } else {
        alert('Failed to delete user');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const columns: Column<UserData>[] = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
          }`}
        >
          {user.role}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (user) => new Date(user.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DataTable
      title="All Users"
      columns={columns}
      data={users}
      onToggleActive={handleToggleActive}
      onEdit={(id) => router.push(`/admin/users/${id}/edit`)}
      onDelete={handleDelete}
    />
  );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/features/admin/DataTable';

interface NavigationMenuItem {
  _id: string;
  title: string;
  isDefault: boolean;
  isActive: boolean;
  linksCount: number;
  createdAt: string;
}

interface NavigationTableProps {
  initialMenus: NavigationMenuItem[];
}

export default function NavigationTable({ initialMenus }: NavigationTableProps) {
  const router = useRouter();
  const [menus, setMenus] = useState<NavigationMenuItem[]>(initialMenus);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/navigation-menus/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setMenus((prev) =>
          prev.map((menu) => (menu._id === id ? { ...menu, isActive } : menu))
        );
      } else {
        alert('Failed to update menu status');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/navigation-menus/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMenus((prev) => prev.filter((menu) => menu._id !== id));
        router.refresh();
      } else {
        alert('Failed to delete menu');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const columns: Column<NavigationMenuItem>[] = [
    { key: 'title', header: 'Title' },
    {
      key: 'isDefault',
      header: 'Default',
      render: (menu) =>
        menu.isDefault ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Default
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'linksCount',
      header: 'Links',
      render: (menu) => `${menu.linksCount} links`,
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (menu) => new Date(menu.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DataTable
      title="All Navigation Menus"
      columns={columns}
      data={menus}
      onToggleActive={handleToggleActive}
      onEdit={(id) => router.push(`/admin/navigation/${id}/edit`)}
      onDelete={handleDelete}
    />
  );
}
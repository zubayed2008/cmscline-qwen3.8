'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/features/admin/DataTable';

interface ServiceItemData {
  _id: string;
  title: string;
  description: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServiceItemsTableProps {
  initialServiceItems: ServiceItemData[];
}

export default function ServiceItemsTable({ initialServiceItems }: ServiceItemsTableProps) {
  const router = useRouter();
  const [serviceItems, setServiceItems] = useState<ServiceItemData[]>(initialServiceItems);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/service-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setServiceItems((prev) =>
          prev.map((item) => (item._id === id ? { ...item, isActive } : item))
        );
      } else {
        alert('Failed to update service item status');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/service-items/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setServiceItems((prev) => prev.filter((item) => item._id !== id));
        router.refresh();
      } else {
        alert('Failed to delete service item');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const columns: Column<ServiceItemData>[] = [
    {
      key: 'icon',
      header: 'Icon',
      render: (item) =>
        item.icon ? (
          item.icon.startsWith('http') ? (
            <img src={item.icon} alt={item.title} className="w-8 h-8 object-cover rounded" />
          ) : (
            <span className="text-2xl">{item.icon}</span>
          )
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    { key: 'title', header: 'Title' },
    {
      key: 'description',
      header: 'Description',
      render: (item) => (
        <span className="line-clamp-2 max-w-xs">{item.description}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (item) => new Date(item.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DataTable
      title="All Service Items"
      columns={columns}
      data={serviceItems}
      onToggleActive={handleToggleActive}
      onEdit={(id) => router.push(`/admin/service-items/${id}/edit`)}
      onDelete={handleDelete}
    />
  );
}
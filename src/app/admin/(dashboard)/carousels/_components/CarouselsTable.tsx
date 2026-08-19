'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/features/admin/DataTable';

interface CarouselData {
  _id: string;
  title: string;
  imageOrIconUrl: string;
  type: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CarouselsTableProps {
  initialCarousels: CarouselData[];
}

const typeColors: Record<string, string> = {
  hero: 'bg-green-100 text-green-800',
  client: 'bg-blue-100 text-blue-800',
  employee: 'bg-purple-100 text-purple-800',
  recommendation: 'bg-orange-100 text-orange-800',
};

export default function CarouselsTable({ initialCarousels }: CarouselsTableProps) {
  const router = useRouter();
  const [carousels, setCarousels] = useState<CarouselData[]>(initialCarousels);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/carousels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setCarousels((prev) =>
          prev.map((item) => (item._id === id ? { ...item, isActive } : item))
        );
      } else {
        alert('Failed to update carousel item status');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/carousels/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCarousels((prev) => prev.filter((item) => item._id !== id));
        router.refresh();
      } else {
        alert('Failed to delete carousel item');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const columns: Column<CarouselData>[] = [
    {
      key: 'imageOrIconUrl',
      header: 'Image',
      render: (item) =>
        item.imageOrIconUrl.startsWith('http') ? (
          <img
            src={item.imageOrIconUrl}
            alt={item.title || 'Carousel item'}
            className="w-12 h-12 object-cover rounded"
          />
        ) : (
          <span className="text-2xl">{item.imageOrIconUrl}</span>
        ),
    },
    { key: 'title', header: 'Title' },
    {
      key: 'type',
      header: 'Type',
      render: (item) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${typeColors[item.type] || 'bg-gray-100 text-gray-800'}`}
        >
          {item.type}
        </span>
      ),
    },
    { key: 'order', header: 'Order' },
    {
      key: 'createdAt',
      header: 'Created',
      render: (item) => new Date(item.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DataTable
      title="All Carousel Items"
      columns={columns}
      data={carousels}
      onToggleActive={handleToggleActive}
      onEdit={(id) => router.push(`/admin/carousels/${id}/edit`)}
      onDelete={handleDelete}
    />
  );
}
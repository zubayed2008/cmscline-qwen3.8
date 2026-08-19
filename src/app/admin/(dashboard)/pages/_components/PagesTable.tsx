'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/features/admin/DataTable';

interface PageItem {
  _id: string;
  title: string;
  slug: string;
  isDefaultHomepage: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PagesTableProps {
  initialPages: PageItem[];
}

export default function PagesTable({ initialPages }: PagesTableProps) {
  const router = useRouter();
  const [pages, setPages] = useState<PageItem[]>(initialPages);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setPages((prev) =>
          prev.map((page) => (page._id === id ? { ...page, isActive } : page))
        );
      } else {
        alert('Failed to update page status');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/pages/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPages((prev) => prev.filter((page) => page._id !== id));
        router.refresh();
      } else {
        alert('Failed to delete page');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const columns: Column<PageItem>[] = [
    { key: 'title', header: 'Title' },
    { key: 'slug', header: 'Slug' },
    {
      key: 'isDefaultHomepage',
      header: 'Default Homepage',
      render: (page) =>
        page.isDefaultHomepage ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Default
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (page) => new Date(page.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DataTable
      title="All Pages"
      columns={columns}
      data={pages}
      onToggleActive={handleToggleActive}
      onEdit={(id) => router.push(`/admin/pages/${id}/edit`)}
      onDelete={handleDelete}
    />
  );
}
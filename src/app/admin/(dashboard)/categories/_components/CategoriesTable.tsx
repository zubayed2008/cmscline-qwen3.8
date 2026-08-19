'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/features/admin/DataTable';

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CategoriesTableProps {
  initialCategories: CategoryItem[];
}

export default function CategoriesTable({ initialCategories }: CategoriesTableProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setCategories((prev) =>
          prev.map((category) => (category._id === id ? { ...category, isActive } : category))
        );
      } else {
        alert('Failed to update category status');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCategories((prev) => prev.filter((category) => category._id !== id));
        router.refresh();
      } else {
        alert('Failed to delete category');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const columns: Column<CategoryItem>[] = [
    { key: 'name', header: 'Name' },
    { key: 'slug', header: 'Slug' },
    {
      key: 'createdAt',
      header: 'Created',
      render: (category) => new Date(category.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DataTable
      title="All Categories"
      columns={columns}
      data={categories}
      onToggleActive={handleToggleActive}
      onEdit={(id) => router.push(`/admin/categories/${id}/edit`)}
      onDelete={handleDelete}
    />
  );
}
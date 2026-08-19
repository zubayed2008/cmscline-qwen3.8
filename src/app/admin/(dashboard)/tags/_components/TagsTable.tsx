'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/features/admin/DataTable';

interface TagItem {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TagsTableProps {
  initialTags: TagItem[];
}

export default function TagsTable({ initialTags }: TagsTableProps) {
  const router = useRouter();
  const [tags, setTags] = useState<TagItem[]>(initialTags);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setTags((prev) => prev.map((tag) => (tag._id === id ? { ...tag, isActive } : tag)));
      } else {
        alert('Failed to update tag status');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTags((prev) => prev.filter((tag) => tag._id !== id));
        router.refresh();
      } else {
        alert('Failed to delete tag');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const columns: Column<TagItem>[] = [
    { key: 'name', header: 'Name' },
    { key: 'slug', header: 'Slug' },
    {
      key: 'createdAt',
      header: 'Created',
      render: (tag) => new Date(tag.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DataTable
      title="All Tags"
      columns={columns}
      data={tags}
      onToggleActive={handleToggleActive}
      onEdit={(id) => router.push(`/admin/tags/${id}/edit`)}
      onDelete={handleDelete}
    />
  );
}

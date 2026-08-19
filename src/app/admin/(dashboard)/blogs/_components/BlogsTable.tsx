'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/features/admin/DataTable';

interface BlogItem {
  _id: string;
  title: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
}

interface BlogsTableProps {
  initialBlogs: BlogItem[];
}

export default function BlogsTable({ initialBlogs }: BlogsTableProps) {
  const router = useRouter();
  const [blogs, setBlogs] = useState<BlogItem[]>(initialBlogs);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/blogs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setBlogs((prev) => prev.map((blog) => (blog._id === id ? { ...blog, isActive } : blog)));
      } else {
        alert('Failed to update blog status');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/blogs/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBlogs((prev) => prev.filter((blog) => blog._id !== id));
        router.refresh();
      } else {
        alert('Failed to delete blog');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const columns: Column<BlogItem>[] = [
    { key: 'title', header: 'Title' },
    { key: 'slug', header: 'Slug' },
    {
      key: 'createdAt',
      header: 'Created',
      render: (blog) => new Date(blog.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DataTable
      title="All Blogs"
      columns={columns}
      data={blogs}
      onToggleActive={handleToggleActive}
      onEdit={(id) => router.push(`/admin/blogs/${id}/edit`)}
      onDelete={handleDelete}
    />
  );
}

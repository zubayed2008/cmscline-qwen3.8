'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/features/admin/DataTable';

interface MediaItem {
  _id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MediaTableProps {
  initialMedia: MediaItem[];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function MediaTable({ initialMedia }: MediaTableProps) {
  const router = useRouter();
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setMedia((prev) => prev.map((item) => (item._id === id ? { ...item, isActive } : item)));
      } else {
        alert('Failed to update media status');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMedia((prev) => prev.filter((item) => item._id !== id));
        router.refresh();
      } else {
        alert('Failed to delete media');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const columns: Column<MediaItem>[] = [
    {
      key: 'url',
      header: 'Preview',
      render: (item) =>
        item.mimeType.startsWith('image/') ? (
          <img src={item.url} alt={item.filename} className="w-12 h-12 object-cover rounded" />
        ) : (
          <span className="text-gray-400">📄</span>
        ),
    },
    { key: 'filename', header: 'Filename' },
    { key: 'mimeType', header: 'Type' },
    {
      key: 'size',
      header: 'Size',
      render: (item) => formatFileSize(item.size),
    },
    {
      key: 'createdAt',
      header: 'Uploaded',
      render: (item) => new Date(item.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DataTable
      title="Media Library"
      columns={columns}
      data={media}
      onToggleActive={handleToggleActive}
      onEdit={(id) => router.push(`/admin/media/${id}/edit`)}
      onDelete={handleDelete}
    />
  );
}

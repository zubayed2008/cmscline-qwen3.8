'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/features/admin/DataTable';

interface ContactSubmissionItem {
  _id: string;
  name: string;
  email: string;
  message: string;
  isRead: boolean;
  captchaScore: number | null;
  createdAt: string;
  updatedAt: string;
}

interface ContactSubmissionsTableProps {
  initialSubmissions: ContactSubmissionItem[];
}

export default function ContactSubmissionsTable({
  initialSubmissions,
}: ContactSubmissionsTableProps) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<ContactSubmissionItem[]>(initialSubmissions);

  const handleToggleRead = async (id: string, isRead: boolean) => {
    try {
      const response = await fetch(`/api/contact/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead }),
      });

      if (response.ok) {
        setSubmissions((prev) =>
          prev.map((submission) => (submission._id === id ? { ...submission, isRead } : submission))
        );
      } else {
        alert('Failed to update submission status');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/contact/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSubmissions((prev) => prev.filter((submission) => submission._id !== id));
        router.refresh();
      } else {
        alert('Failed to delete submission');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const columns: Column<ContactSubmissionItem>[] = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    {
      key: 'message',
      header: 'Message',
      render: (submission) => <span className="line-clamp-2 max-w-md">{submission.message}</span>,
    },
    {
      key: 'isRead',
      header: 'Status',
      render: (submission) =>
        submission.isRead ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Read
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Unread
          </span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Received',
      render: (submission) => new Date(submission.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <DataTable
      title="Contact Submissions"
      columns={columns}
      data={submissions}
      onToggleActive={handleToggleRead}
      onEdit={(id) => router.push(`/admin/contact-submissions/${id}`)}
      onDelete={handleDelete}
    />
  );
}

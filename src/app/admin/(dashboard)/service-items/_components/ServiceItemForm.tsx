'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';

interface ServiceItemFormProps {
  initialData?: {
    _id: string;
    title: string;
    description: string;
    icon: string;
    isActive: boolean;
  };
}

export default function ServiceItemForm({ initialData }: ServiceItemFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [icon, setIcon] = useState(initialData?.icon ?? '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = isEditing ? `/api/service-items/${initialData._id}` : '/api/service-items';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          icon: icon || undefined,
          isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save service item');
        return;
      }

      router.push('/admin/service-items');
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Edit Service Item' : 'Create New Service Item'}
        </h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter service title"
            required
          />

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter service description"
            rows={4}
            required
          />

          <Input
            label="Icon (URL or emoji)"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="https://example.com/icon.png or 🚀"
          />

          <Toggle label="Active" checked={isActive} onChange={setIsActive} />

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Service Item' : 'Create Service Item'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/admin/service-items')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

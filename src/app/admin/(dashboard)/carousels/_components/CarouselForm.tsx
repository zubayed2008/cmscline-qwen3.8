'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';

interface CarouselFormProps {
  initialData?: {
    _id: string;
    title: string;
    imageOrIconUrl: string;
    type: string;
    order: number;
    isActive: boolean;
  };
}

export default function CarouselForm({ initialData }: CarouselFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [imageOrIconUrl, setImageOrIconUrl] = useState(initialData?.imageOrIconUrl ?? '');
  const [type, setType] = useState(initialData?.type ?? 'hero');
  const [order, setOrder] = useState(initialData?.order ?? 0);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = isEditing ? `/api/carousels/${initialData._id}` : '/api/carousels';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || undefined,
          imageOrIconUrl,
          type,
          order: Number(order),
          isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save carousel item');
        return;
      }

      router.push('/admin/carousels');
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
          {isEditing ? 'Edit Carousel Item' : 'Create New Carousel Item'}
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
            label="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter carousel item title"
          />

          <Input
            label="Image or Icon URL"
            value={imageOrIconUrl}
            onChange={(e) => setImageOrIconUrl(e.target.value)}
            placeholder="https://example.com/image.jpg or emoji"
            required
          />

          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: 'hero', label: 'Hero' },
              { value: 'client', label: 'Client' },
              { value: 'employee', label: 'Employee' },
              { value: 'recommendation', label: 'Recommendation' },
            ]}
          />

          <Input
            label="Order"
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            min={0}
          />

          <Toggle label="Active" checked={isActive} onChange={setIsActive} />

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Carousel Item' : 'Create Carousel Item'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/admin/carousels')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
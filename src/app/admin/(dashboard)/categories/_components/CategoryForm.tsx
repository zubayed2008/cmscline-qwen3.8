'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';

interface CategoryFormProps {
  initialData?: {
    _id: string;
    name: string;
    slug: string;
    isActive: boolean;
  };
}

export default function CategoryForm({ initialData }: CategoryFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEditing) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = isEditing ? `/api/categories/${initialData._id}` : '/api/categories';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save category');
        return;
      }

      router.push('/admin/categories');
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
          {isEditing ? 'Edit Category' : 'Create New Category'}
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
            label="Name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Enter category name"
            required
          />

          <Input
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(generateSlug(e.target.value))}
            placeholder="category-url-slug"
            required
          />

          <Toggle label="Active" checked={isActive} onChange={setIsActive} />

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Category' : 'Create Category'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/admin/categories')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

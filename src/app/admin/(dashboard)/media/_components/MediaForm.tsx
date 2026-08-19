'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';

interface MediaFormProps {
  initialData?: {
    _id: string;
    filename: string;
    url: string;
    mimeType: string;
    size: number;
    isActive: boolean;
  };
}

export default function MediaForm({ initialData }: MediaFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [filename, setFilename] = useState(initialData?.filename ?? '');
  const [url, setUrl] = useState(initialData?.url ?? '');
  const [mimeType, setMimeType] = useState(initialData?.mimeType ?? '');
  const [size, setSize] = useState(initialData?.size?.toString() ?? '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const urlEndpoint = isEditing ? `/api/media/${initialData._id}` : '/api/media';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(urlEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          url,
          mimeType,
          size: parseInt(size, 10) || 0,
          isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save media');
        return;
      }

      router.push('/admin/media');
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
          {isEditing ? 'Edit Media' : 'Add New Media'}
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
            label="Filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="example-image.jpg"
            required
          />

          <Input
            label="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/images/example.jpg"
            required
          />

          <Input
            label="MIME Type"
            value={mimeType}
            onChange={(e) => setMimeType(e.target.value)}
            placeholder="image/jpeg"
            required
          />

          <Input
            label="Size (bytes)"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="102400"
            type="number"
            required
          />

          <Toggle label="Active" checked={isActive} onChange={setIsActive} />

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Media' : 'Add Media'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/admin/media')}>
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

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

interface ImageEntry {
  id: string;
  url: string;
  title: string;
}

export default function CarouselForm({ initialData }: CarouselFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  // For editing, use single image mode; for creating, allow multiple images
  const [images, setImages] = useState<ImageEntry[]>(
    initialData
      ? [{ id: '1', url: initialData.imageOrIconUrl, title: initialData.title }]
      : [{ id: '1', url: '', title: '' }]
  );
  const [type, setType] = useState(initialData?.type ?? 'hero');
  const [order, setOrder] = useState(initialData?.order ?? 0);
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addImageField = () => {
    setImages((prev) => [...prev, { id: Date.now().toString(), url: '', title: '' }]);
  };

  const removeImageField = (id: string) => {
    if (images.length > 1) {
      setImages((prev) => prev.filter((img) => img.id !== id));
    }
  };

  const updateImage = (id: string, field: 'url' | 'title', value: string) => {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, [field]: value } : img)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditing) {
        // Update single carousel item
        const response = await fetch(`/api/carousels/${initialData._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: images[0].title || undefined,
            imageOrIconUrl: images[0].url,
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
      } else {
        // Create multiple carousel items
        const validImages = images.filter((img) => img.url.trim() !== '');

        if (validImages.length === 0) {
          setError('Please add at least one image URL');
          setLoading(false);
          return;
        }

        for (let i = 0; i < validImages.length; i++) {
          const img = validImages[i];
          const response = await fetch('/api/carousels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: img.title || undefined,
              imageOrIconUrl: img.url,
              type,
              order: Number(order) + i,
              isActive,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            setError(data.error || `Failed to save image ${i + 1}`);
            setLoading(false);
            return;
          }
        }
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
          {isEditing ? 'Edit Carousel Item' : 'Create Carousel Items'}
        </h2>
        {!isEditing && (
          <p className="text-sm text-gray-500 mt-1">
            You can add multiple images to the carousel. Each image will be added as a separate
            slide.
          </p>
        )}
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Image entries */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              {isEditing ? 'Image' : 'Images'}
            </label>
            {images.map((img, index) => (
              <div
                key={img.id}
                className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Image {index + 1}</span>
                  {!isEditing && images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImageField(img.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <Input
                  label="Image URL"
                  value={img.url}
                  onChange={(e) => updateImage(img.id, 'url', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  required
                />
                <Input
                  label="Title (optional)"
                  value={img.title}
                  onChange={(e) => updateImage(img.id, 'title', e.target.value)}
                  placeholder="Enter image title"
                />
                {/* Preview */}
                {img.url && (
                  <div className="mt-2">
                    <img
                      src={img.url}
                      alt={img.title || `Preview ${index + 1}`}
                      className="h-24 w-auto rounded border border-gray-200 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add another image button (only for create mode) */}
          {!isEditing && (
            <Button type="button" variant="secondary" onClick={addImageField}>
              + Add Another Image
            </Button>
          )}

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
            label="Starting Order"
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            min={0}
          />

          <Toggle label="Active" checked={isActive} onChange={setIsActive} />

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading
                ? 'Saving...'
                : isEditing
                  ? 'Update Carousel Item'
                  : `Create ${images.filter((i) => i.url.trim()).length || ''} Carousel Item${images.filter((i) => i.url.trim()).length !== 1 ? 's' : ''}`}
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
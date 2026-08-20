'use client';

import { useState, useEffect } from 'react';
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

interface MediaItem {
  _id: string;
  filename: string;
  url: string;
  optimizedUrl?: string;
  mimeType: string;
}

type InputMode = 'library' | 'manual';

export default function CarouselForm({ initialData }: CarouselFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  // Media library state
  const [availableMedia, setAvailableMedia] = useState<MediaItem[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>(isEditing ? 'manual' : 'library');
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

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

  // Fetch available media on mount
  useEffect(() => {
    const fetchMedia = async () => {
      setIsLoadingMedia(true);
      try {
        const response = await fetch('/api/media');
        if (response.ok) {
          const data = await response.json();
          // Filter only image types
          const imageMedia = (data.data || []).filter((m: MediaItem) =>
            m.mimeType.startsWith('image/')
          );
          setAvailableMedia(imageMedia);
        }
      } catch {
        console.error('Failed to fetch media');
      } finally {
        setIsLoadingMedia(false);
      }
    };
    fetchMedia();
  }, []);

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

  const selectMedia = (imageIndex: number, media: MediaItem) => {
    setImages((prev) =>
      prev.map((img, idx) =>
        idx === imageIndex ? { ...img, url: media.optimizedUrl || media.url } : img
      )
    );
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
    <Card className="max-w-4xl">
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

          {/* Input Mode Toggle - Only for create mode */}
          {!isEditing && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Image Source</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setInputMode('library')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === 'library'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Select from Media Library
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('manual')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === 'manual'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Enter URL Manually
                </button>
              </div>
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

                {/* Media Library Selector */}
                {(inputMode === 'library' || isEditing) && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600">
                      Select from Media Library
                    </label>
                    {isLoadingMedia ? (
                      <div className="text-sm text-gray-500 py-4">Loading media...</div>
                    ) : availableMedia.length === 0 ? (
                      <div className="text-sm text-gray-500 py-4">
                        No images in media library.{' '}
                        <a href="/admin/media/new" className="text-blue-600 hover:underline">
                          Add some first
                        </a>
                        .
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded border">
                        {availableMedia.map((media) => (
                          <button
                            key={media._id}
                            type="button"
                            onClick={() => selectMedia(index, media)}
                            className={`relative aspect-square rounded border-2 overflow-hidden hover:border-blue-500 transition-colors ${
                              img.url === (media.optimizedUrl || media.url)
                                ? 'border-blue-600 ring-2 ring-blue-200'
                                : 'border-gray-200'
                            }`}
                            title={media.filename}
                          >
                            <img
                              src={media.url}
                              alt={media.filename}
                              className="w-full h-full object-cover"
                            />
                            {img.url === (media.optimizedUrl || media.url) && (
                              <div className="absolute inset-0 bg-blue-600 bg-opacity-20 flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Manual URL Input */}
                {(inputMode === 'manual' || isEditing) && (
                  <Input
                    label="Image URL"
                    value={img.url}
                    onChange={(e) => updateImage(img.id, 'url', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    required
                  />
                )}

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
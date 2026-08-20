'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import FileUploader from '@/components/features/admin/FileUploader';

interface MediaFormProps {
  initialData?: {
    _id: string;
    filename: string;
    url: string;
    optimizedUrl?: string;
    mimeType: string;
    size: number;
    storageType: 'url' | 'upload';
    publicId?: string;
    dimensions?: {
      width: number;
      height: number;
    };
    altText?: string;
    caption?: string;
    isActive: boolean;
  };
}

type InputMode = 'url' | 'upload';

export default function MediaForm({ initialData }: MediaFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  // Determine initial mode based on existing data
  const [inputMode, setInputMode] = useState<InputMode>(
    initialData?.storageType || 'url'
  );

  // Common fields
  const [filename, setFilename] = useState(initialData?.filename ?? '');
  const [url, setUrl] = useState(initialData?.url ?? '');
  const [altText, setAltText] = useState(initialData?.altText ?? '');
  const [caption, setCaption] = useState(initialData?.caption ?? '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // File upload fields
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.url ?? null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (inputMode === 'upload' && selectedFile) {
        // File upload mode
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (altText) formData.append('altText', altText);
        if (caption) formData.append('caption', caption);
        formData.append('isActive', isActive.toString());

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to upload media');
          return;
        }

        router.push('/admin/media');
        router.refresh();
      } else if (inputMode === 'url') {
        // URL input mode
        if (!url) {
          setError('URL is required');
          setLoading(false);
          return;
        }

        const urlEndpoint = isEditing ? `/api/media/${initialData._id}` : '/api/media';
        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(urlEndpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename,
            url,
            mimeType: 'image/jpeg', // Default for URL mode
            size: 0,
            altText,
            caption,
            isActive,
            storageType: 'url',
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to save media');
          return;
        }

        router.push('/admin/media');
        router.refresh();
      } else {
        setError('Please select a file to upload');
        setLoading(false);
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setFilename(file.name);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
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

          {/* Input Mode Toggle */}
          {!isEditing && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Input Method
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setInputMode('url')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === 'url'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  URL Input
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    inputMode === 'upload'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  File Upload
                </button>
              </div>
            </div>
          )}

          {/* File Upload Mode */}
          {inputMode === 'upload' && (
            <FileUploader
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              previewUrl={isEditing ? initialData.url : null}
              maxSizeMB={2}
            />
          )}

          {/* URL Input Mode */}
          {inputMode === 'url' && (
            <>
              <Input
                label="Filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="example-image.jpg"
                required={inputMode === 'url'}
              />

              <Input
                label="URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/images/example.jpg"
                required={inputMode === 'url'}
              />
            </>
          )}

          {/* Common Fields */}
          <Input
            label="Alt Text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Description of the image for accessibility"
          />

          <Textarea
            label="Caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Optional caption for the image"
            rows={3}
          />

          <Toggle label="Active" checked={isActive} onChange={setIsActive} />

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading
                ? 'Saving...'
                : isEditing
                  ? 'Update Media'
                  : inputMode === 'upload'
                    ? 'Upload Media'
                    : 'Add Media'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/admin/media')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
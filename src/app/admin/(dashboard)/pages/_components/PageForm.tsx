'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Toggle from '@/components/ui/Toggle';
import RichTextEditor from '@/components/editor/RichTextEditor';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';

interface PageFormProps {
  initialData?: {
    _id: string;
    title: string;
    slug: string;
    content: string;
    isDefaultHomepage: boolean;
    isActive: boolean;
  };
}

export default function PageForm({ initialData }: PageFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [content, setContent] = useState(initialData?.content ?? '');
  const [isDefaultHomepage, setIsDefaultHomepage] = useState(
    initialData?.isDefaultHomepage ?? false
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Track the initialData object we last synced from so we can detect
  // server-side refreshes (e.g. after restoring a version in VersionHistory).
  // React-approved "adjust state when a prop changes" pattern: compare during
  // render and reset local state — only fires when the parent re-renders with
  // genuinely new props, never while the user types.
  const [lastSyncedData, setLastSyncedData] = useState(initialData);

  if (initialData !== lastSyncedData) {
    setLastSyncedData(initialData);
    if (initialData) {
      setTitle(initialData.title);
      setSlug(initialData.slug);
      setContent(initialData.content);
      setIsDefaultHomepage(initialData.isDefaultHomepage);
      setIsActive(initialData.isActive);
    }
  }

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isEditing) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = isEditing ? `/api/pages/${initialData._id}` : '/api/pages';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          content,
          isDefaultHomepage,
          isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save page');
        return;
      }

      router.push('/admin/pages');
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
          {isEditing ? 'Edit Page' : 'Create New Page'}
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
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Enter page title"
            required
          />

          <Input
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(generateSlug(e.target.value))}
            placeholder="page-url-slug"
            required
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Content <span className="text-red-500">*</span>
            </label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Write your page content here..."
            />
          </div>

          <div className="flex items-center gap-8">
            <Toggle
              label="Default Homepage"
              checked={isDefaultHomepage}
              onChange={setIsDefaultHomepage}
            />
            <Toggle label="Active" checked={isActive} onChange={setIsActive} />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Page' : 'Create Page'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/admin/pages')}>
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

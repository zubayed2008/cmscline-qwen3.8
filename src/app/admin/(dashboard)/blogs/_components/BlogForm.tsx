'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import RichTextEditor from '@/components/editor/RichTextEditor';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';

interface CategoryOption {
  _id: string;
  name: string;
}

interface TagOption {
  _id: string;
  name: string;
}

/** Per-locale overrides as sent to / accepted from the API (Phase 15.5) */
type TranslationsMap = Record<string, { title?: string; content?: string }>;

interface BlogFormProps {
  initialData?: {
    _id: string;
    title: string;
    slug: string;
    content: string;
    translations?: TranslationsMap;
    category: string;
    tags: string[];
    featuredImage: string;
    isActive: boolean;
  };
  categories: CategoryOption[];
  tags: TagOption[];
}

/** Language tabs shown in the form (English is the source of truth) */
const LANGUAGE_TABS = [
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
] as const;

type LanguageTabCode = (typeof LANGUAGE_TABS)[number]['code'];

export default function BlogForm({ initialData, categories, tags }: BlogFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [content, setContent] = useState(initialData?.content ?? '');
  const [category, setCategory] = useState(initialData?.category ?? '');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags ?? []);
  const [featuredImage, setFeaturedImage] = useState(initialData?.featuredImage ?? '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  // Phase 15.5: Bangla translation fields (empty string = untranslated)
  const [activeTab, setActiveTab] = useState<LanguageTabCode>('en');
  const [bnTitle, setBnTitle] = useState(initialData?.translations?.bn?.title ?? '');
  const [bnContent, setBnContent] = useState(initialData?.translations?.bn?.content ?? '');

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
      setBnTitle(initialData.translations?.bn?.title ?? '');
      setBnContent(initialData.translations?.bn?.content ?? '');
      setCategory(initialData.category);
      setSelectedTags([...initialData.tags]);
      setFeaturedImage(initialData.featuredImage);
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

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = isEditing ? `/api/blogs/${initialData._id}` : '/api/blogs';
      const method = isEditing ? 'PUT' : 'POST';

      // Phase 15.5: build the translations payload. Empty fields are omitted so
      // the API stores only what was actually translated; the whole map is
      // replaced on save (the form always submits the complete bn entry).
      const bnTranslation: { title?: string; content?: string } = {};
      if (bnTitle.trim()) bnTranslation.title = bnTitle;
      if (bnContent.trim()) bnTranslation.content = bnContent;
      const translations = Object.keys(bnTranslation).length > 0 ? { bn: bnTranslation } : {};

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          content,
          translations,
          category: category || undefined,
          tags: selectedTags,
          featuredImage: featuredImage || undefined,
          isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save blog');
        return;
      }

      router.push('/admin/blogs');
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
          {isEditing ? 'Edit Blog' : 'Create New Blog'}
        </h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Language Tabs (Phase 15.5) */}
          <div
            className="flex gap-2 border-b border-gray-200"
            role="tablist"
            aria-label="Content languages"
          >
            {LANGUAGE_TABS.map((tab) => (
              <button
                key={tab.code}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.code}
                onClick={() => setActiveTab(tab.code)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.code
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.code !== 'en' && !bnTitle.trim() && !bnContent.trim() && (
                  <span className="ml-1.5 text-xs text-amber-500" title="Untranslated">
                    ●
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'en' && (
            <>
              <Input
                label="Title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter blog title"
                required
              />

              <Input
                label="Slug"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                placeholder="blog-url-slug"
                required
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Content <span className="text-red-500">*</span>
                </label>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Write your blog content here..."
                />
              </div>
            </>
          )}

          {activeTab === 'bn' && (
            <>
              <Input
                label="Title (বাংলা)"
                value={bnTitle}
                onChange={(e) => setBnTitle(e.target.value)}
                placeholder="বাংলা শিরোনাম লিখুন"
              />
              <p className="-mt-3 text-xs text-gray-500">
                Optional — if left empty, visitors see the English title.
              </p>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Content (বাংলা)
                </label>
                <RichTextEditor
                  content={bnContent}
                  onChange={setBnContent}
                  placeholder="বাংলা কনটেন্ট এখানে লিখুন..."
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Optional — if left empty, visitors see the English content.
                </p>
              </div>
            </>
          )}

          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={categories.map((c) => ({ value: c._id, label: c.name }))}
            placeholder="Select a category"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag._id}
                  type="button"
                  onClick={() => handleTagToggle(tag._id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag._id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
              {tags.length === 0 && <p className="text-sm text-gray-500">No tags available</p>}
            </div>
          </div>

          <Input
            label="Featured Image ID (Media)"
            value={featuredImage}
            onChange={(e) => setFeaturedImage(e.target.value)}
            placeholder="Media ID for featured image"
          />

          <Toggle label="Active" checked={isActive} onChange={setIsActive} />

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Update Blog' : 'Create Blog'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/admin/blogs')}>
              Cancel
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

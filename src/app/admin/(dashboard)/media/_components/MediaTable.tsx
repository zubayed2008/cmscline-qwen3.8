'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/features/admin/DataTable';

interface MediaItem {
  _id: string;
  filename: string;
  url: string;
  optimizedUrl: string;
  mimeType: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  storageType: 'url' | 'upload';
  altText: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MediaTableProps {
  initialMedia: MediaItem[];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
      title={`Copy ${label || 'URL'}`}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          {label || 'Copy'}
        </>
      )}
    </button>
  );
}

export default function MediaTable({ initialMedia }: MediaTableProps) {
  const router = useRouter();
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setMedia((prev) => prev.map((item) => (item._id === id ? { ...item, isActive } : item)));
      } else {
        alert('Failed to update media status');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMedia((prev) => prev.filter((item) => item._id !== id));
        router.refresh();
      } else {
        alert('Failed to delete media');
      }
    } catch {
      alert('An error occurred');
    }
  };

  const columns: Column<MediaItem>[] = [
    {
      key: 'url',
      header: 'Preview',
      render: (item) =>
        item.mimeType.startsWith('image/') ? (
          <img src={item.url} alt={item.filename} className="w-12 h-12 object-cover rounded" />
        ) : (
          <span className="text-gray-400">📄</span>
        ),
    },
    { key: 'filename', header: 'Filename' },
    {
      key: 'dimensions',
      header: 'Dimensions',
      render: (item) =>
        item.dimensions ? `${item.dimensions.width}×${item.dimensions.height}` : '-',
    },
    {
      key: 'size',
      header: 'Size',
      render: (item) => formatFileSize(item.size),
    },
    {
      key: 'createdAt',
      header: 'Uploaded',
      render: (item) => new Date(item.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'URLs',
      render: (item) => (
        <button
          type="button"
          onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          {expandedId === item._id ? 'Hide' : 'Show'} URLs
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        title="Media Library"
        columns={columns}
        data={media}
        onToggleActive={handleToggleActive}
        onEdit={(id) => router.push(`/admin/media/${id}/edit`)}
        onDelete={handleDelete}
      />

      {/* Expanded URL Details */}
      {expandedId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {(() => {
              const item = media.find((m) => m._id === expandedId);
              if (!item) return null;
              return (
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Media Details</h3>
                    <button
                      type="button"
                      onClick={() => setExpandedId(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Preview */}
                  {item.mimeType.startsWith('image/') && (
                    <div className="flex justify-center">
                      <img
                        src={item.url}
                        alt={item.filename}
                        className="max-h-48 rounded-lg object-contain"
                      />
                    </div>
                  )}

                  {/* Properties Grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-500">Filename:</span>
                      <p className="text-gray-900">{item.filename}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Type:</span>
                      <p className="text-gray-900">{item.mimeType}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Size:</span>
                      <p className="text-gray-900">{formatFileSize(item.size)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Dimensions:</span>
                      <p className="text-gray-900">
                        {item.dimensions
                          ? `${item.dimensions.width}×${item.dimensions.height}px`
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Storage Type:</span>
                      <p className="text-gray-900 capitalize">{item.storageType}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Alt Text:</span>
                      <p className="text-gray-900">{item.altText || 'N/A'}</p>
                    </div>
                  </div>

                  {/* URLs with Copy */}
                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Original URL
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-gray-100 p-2 rounded break-all">
                          {item.url}
                        </code>
                        <CopyButton text={item.url} label="Copy" />
                      </div>
                    </div>

                    {item.optimizedUrl && item.optimizedUrl !== item.url && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Optimized URL
                        </label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-gray-100 p-2 rounded break-all">
                            {item.optimizedUrl}
                          </code>
                          <CopyButton text={item.optimizedUrl} label="Copy" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setExpandedId(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
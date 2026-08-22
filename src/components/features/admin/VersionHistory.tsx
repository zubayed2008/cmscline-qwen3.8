'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { History, RotateCcw, Trash2, RefreshCw, GitCompare } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Select from '@/components/ui/Select';

export interface VersionHistoryCurrent {
  title: string;
  slug: string;
  content: string;
  /** Phase 15.5: per-locale overrides so Bangla fields can be compared too */
  translations?: Record<string, { title?: string; content?: string }>;
}

/** Serializable version record passed from the Server Component. */
export interface SerializedVersion {
  _id: string;
  version: number;
  title: string;
  slug: string;
  content: string;
  translations?: Record<string, { title?: string; content?: string }>;
  changeSummary?: string;
  changedByName: string;
  createdAt: string;
}

interface VersionHistoryProps {
  contentType: 'page' | 'blog';
  contentId: string;
  current: VersionHistoryCurrent;
  /** Versions fetched server-side on page load. */
  initialVersions: SerializedVersion[];
}

const CURRENT_ID = '__current__';

/** Maps a raw API version document into the serializable shape. */
function toSerialized(raw: Record<string, unknown>): SerializedVersion {
  const changedBy = raw.changedBy as { name?: string; email?: string } | string | null;
  return {
    _id: String(raw._id),
    version: Number(raw.version),
    title: String(raw.title),
    slug: String(raw.slug),
    content: String(raw.content),
    translations:
      raw.translations && typeof raw.translations === 'object'
        ? (raw.translations as SerializedVersion['translations'])
        : {},
    changeSummary: raw.changeSummary ? String(raw.changeSummary) : undefined,
    changedByName:
      typeof changedBy === 'object' && changedBy !== null
        ? changedBy.name || changedBy.email || 'Unknown'
        : 'Unknown',
    createdAt: String(raw.createdAt),
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function VersionHistory({
  contentType,
  contentId,
  current,
  initialVersions,
}: VersionHistoryProps) {
  const router = useRouter();
  const [versions, setVersions] = useState<SerializedVersion[]>(initialVersions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [compareA, setCompareA] = useState(CURRENT_ID);
  const [compareB, setCompareB] = useState(CURRENT_ID);

  // Manual refresh (event handler) - initial data comes from the server via props
  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const res = await fetch(
        `/api/versions?contentType=${contentType}&contentId=${contentId}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load version history');
        return;
      }
      setVersions((data.data as Record<string, unknown>[]).map(toSerialized));
    } catch {
      setError('Failed to load version history');
    } finally {
      setLoading(false);
    }
  }, [contentType, contentId]);

  const handleRestore = async (version: SerializedVersion) => {
    const confirmed = window.confirm(
      `Restore content to version ${version.version}?\n\nThe current state will be saved as a new version first, so this restore can be undone.`
    );
    if (!confirmed) return;

    setActionError('');
    setSuccessMessage('');
    setBusyId(version._id);
    try {
      const res = await fetch(`/api/versions/${version._id}`, { method: 'PUT' });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Failed to restore version');
        return;
      }
      await fetchVersions();
      setSuccessMessage(
        `Restored version ${version.version}. The edit form above now shows the restored content.`
      );
      // Re-render the Server Component so PageForm/BlogForm receive the
      // restored title/slug/content through their props.
      router.refresh();
      // The edit form lives above this card; bring it back into view so the
      // restored content is visible without hunting for it.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setActionError('An error occurred while restoring');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (version: SerializedVersion) => {
    const confirmed = window.confirm(
      `Permanently delete version ${version.version}? This cannot be undone.`
    );
    if (!confirmed) return;

    setActionError('');
    setBusyId(version._id);
    try {
      const res = await fetch(`/api/versions/${version._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'Failed to delete version');
        return;
      }
      if (compareA === version._id) setCompareA(CURRENT_ID);
      if (compareB === version._id) setCompareB(CURRENT_ID);
      await fetchVersions();
    } catch {
      setActionError('An error occurred while deleting');
    } finally {
      setBusyId(null);
    }
  };

  const resolveSide = (id: string): { label: string; data: VersionHistoryCurrent } => {
    if (id === CURRENT_ID) return { label: 'Current', data: current };
    const v = versions.find((ver) => ver._id === id);
    if (!v) return { label: 'Unknown', data: current };
    return {
      label: `v${v.version}`,
      data: {
        title: v.title,
        slug: v.slug,
        content: v.content,
        translations: v.translations,
      },
    };
  };

  const sideA = resolveSide(compareA);
  const sideB = resolveSide(compareB);
  const fields: Array<{
    id: string;
    label: string;
    value: (data: VersionHistoryCurrent) => string;
  }> = [
    { id: 'title', label: 'Title', value: (d) => d.title },
    { id: 'slug', label: 'Slug', value: (d) => d.slug },
    { id: 'content', label: 'Content', value: (d) => d.content },
    {
      id: 'bn-title',
      label: 'বাংলা Title',
      value: (d) => d.translations?.bn?.title ?? '',
    },
    {
      id: 'bn-content',
      label: 'বাংলা Content',
      value: (d) => d.translations?.bn?.content ?? '',
    },
  ];

  const versionOptions = [
    { value: CURRENT_ID, label: 'Current' },
    ...versions.map((v) => ({
      value: v._id,
      label: `v${v.version} — ${formatDate(v.createdAt)}`,
    })),
  ];

  return (
    <Card className="max-w-3xl mt-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <History className="h-5 w-5" />
            Version History
          </h2>
          <button
            type="button"
            onClick={fetchVersions}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </CardHeader>
      <CardBody>
        {(error || actionError) && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error || actionError}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {successMessage}
          </div>
        )}

        {loading && versions.length === 0 ? (
          <p className="text-sm text-gray-500">Loading version history...</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-gray-500">
            No versions yet. Versions are created automatically when this {contentType} is created
            or its content changes.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-gray-200">
              {versions.map((version) => (
                <li key={version._id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        v{version.version}
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {version.changeSummary || 'No change summary'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {version.changedByName} · {formatDate(version.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRestore(version)}
                      disabled={busyId === version._id}
                      className="flex items-center gap-1"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {busyId === version._id ? 'Restoring...' : 'Restore'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDelete(version)}
                      disabled={busyId === version._id}
                      className="text-red-500 hover:text-red-700 p-1.5 disabled:opacity-50"
                      title="Delete version"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setShowCompare((prev) => !prev)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <GitCompare className="h-4 w-4" />
                {showCompare ? 'Hide' : 'Show'} Side-by-Side Compare
              </button>

              {showCompare && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Compare From"
                      value={compareA}
                      onChange={(e) => setCompareA(e.target.value)}
                      options={versionOptions}
                    />
                    <Select
                      label="Compare To"
                      value={compareB}
                      onChange={(e) => setCompareB(e.target.value)}
                      options={versionOptions}
                    />
                  </div>

                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Field</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            {sideA.label}
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            {sideB.label}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {fields.map((field) => {
                          const changed =
                            field.value(sideA.data) !== field.value(sideB.data);
                          return (
                            <tr key={field.id}>
                              <td className="px-3 py-2 font-medium text-gray-900 align-top">
                                {field.label}
                                {changed && (
                                  <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-800">
                                    CHANGED
                                  </span>
                                )}
                              </td>
                              <td
                                className={`px-3 py-2 align-top whitespace-pre-wrap break-words ${
                                  changed ? 'bg-red-50 text-red-900' : 'text-gray-600'
                                }`}
                              >
                                {field.value(sideA.data) || (
                                  <em className="text-gray-400">(empty)</em>
                                )}
                              </td>
                              <td
                                className={`px-3 py-2 align-top whitespace-pre-wrap break-words ${
                                  changed ? 'bg-green-50 text-green-900' : 'text-gray-600'
                                }`}
                              >
                                {field.value(sideB.data) || (
                                  <em className="text-gray-400">(empty)</em>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
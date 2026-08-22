'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import StatusBadge from '@/components/features/admin/accounting/StatusBadge';
import MoneyDisplay from '@/components/features/admin/accounting/MoneyDisplay';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface JournalEntryLine {
  id: string;
  accountId: string;
  debit: string;
  credit: string;
  description: string | null;
  lineNumber: number;
}

interface JournalEntryItem {
  id: string;
  entryNumber: string;
  entryDate: string;
  postingDate: string;
  memo: string | null;
  reference: string | null;
  sourceType: string;
  sourceId: string | null;
  status: string;
  totalDebit: string;
  totalCredit: string;
  version: number;
  createdByName: string | null;
  postedBy: string | null;
  reversalOfId: string | null;
  reversalReason: string | null;
}

interface JournalEntryDetailProps {
  initialEntry: JournalEntryItem;
  initialLines: JournalEntryLine[];
  accounts: AccountOption[];
}

export default function JournalEntryDetail({
  initialEntry,
  initialLines,
  accounts,
}: JournalEntryDetailProps) {
  const router = useRouter();
  const [entry, setEntry] = useState<JournalEntryItem>(initialEntry);
  const [lines, setLines] = useState<JournalEntryLine[]>(initialLines);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [reverseMode, setReverseMode] = useState(false);
  const [reverseReason, setReverseReason] = useState('');

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const refetch = async () => {
    const res = await fetch(`/api/accounting/journal-entries/${entry.id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to reload entry');
      return;
    }
    const loaded = data.data as { entry: JournalEntryItem; lines: JournalEntryLine[] };
    setEntry(loaded.entry);
    setLines(loaded.lines);
    router.refresh();
  };

  const runAction = async (path: string, body?: Record<string, unknown>) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Action failed');
        return;
      }
      setSuccess('Action completed successfully.');
      await refetch();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () =>
    runAction(`/api/accounting/journal-entries/${entry.id}/submit`, { expectedVersion: entry.version });
  const handleApprove = () =>
    runAction(`/api/accounting/journal-entries/${entry.id}/approve`, { expectedVersion: entry.version });
  const handlePost = () => runAction(`/api/accounting/journal-entries/${entry.id}/post`);

  const handleDelete = async () => {
    if (!confirm('Delete this draft? This cannot be undone.')) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/journal-entries/${entry.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Delete failed');
        return;
      }
      router.push('/admin/accounting/journal-entries');
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReverse = () => {
    if (reverseReason.trim().length < 3) {
      setError('A reason of at least 3 characters is required to reverse an entry');
      return;
    }
    runAction(`/api/accounting/journal-entries/${entry.id}/reverse`, { reason: reverseReason.trim() }).then(() => {
      setReverseMode(false);
      setReverseReason('');
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{entry.entryNumber}</h1>
          <StatusBadge status={entry.status} />
        </div>
        <Link href="/admin/accounting/journal-entries" className="text-sm text-blue-600 hover:underline">
          ← Back to journal entries
        </Link>
      </div>

      {error && <ErrorBanner message={error} />}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Entry Lines</h2>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lines.map((line) => {
                    const account = accountMap.get(line.accountId);
                    return (
                      <tr key={line.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-mono text-gray-500">{account?.code ?? '—'}</span>{' '}
                          {account?.name ?? line.accountId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {Number(line.debit) > 0 ? <MoneyDisplay value={line.debit} /> : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                          {Number(line.credit) > 0 ? <MoneyDisplay value={line.credit} /> : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{line.description ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900">Totals</td>
                    <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      <MoneyDisplay value={entry.totalDebit} />
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      <MoneyDisplay value={entry.totalCredit} />
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Details</h2>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Entry date</span>
                <span className="text-gray-900">{entry.entryDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Posted date</span>
                <span className="text-gray-900">{entry.postingDate || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Memo</span>
                <span className="text-gray-900 text-right">{entry.memo ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reference</span>
                <span className="text-gray-900">{entry.reference ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Source</span>
                <span className="text-gray-900">
                  {entry.sourceType.replace(/_/g, ' ')}
                  {entry.sourceId ? ` · ${entry.sourceId}` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created by</span>
                <span className="text-gray-900">{entry.createdByName ?? '—'}</span>
              </div>
              {entry.reversalOfId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Reversal of</span>
                  <span className="text-gray-900 font-mono">{entry.reversalOfId}</span>
                </div>
              )}
              {entry.reversalReason && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Reverse reason</span>
                  <span className="text-gray-900 text-right">{entry.reversalReason}</span>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {entry.status === 'DRAFT' && (
                <>
                  <Button className="w-full" disabled={loading} onClick={handleSubmit}>
                    Submit for Approval
                  </Button>
                  <Button
                    className="w-full"
                    variant="danger"
                    disabled={loading}
                    onClick={handleDelete}
                  >
                    Delete Draft
                  </Button>
                </>
              )}
              {entry.status === 'PENDING_APPROVAL' && (
                <Button className="w-full" disabled={loading} onClick={handleApprove}>
                  Approve Entry
                </Button>
              )}
              {entry.status === 'APPROVED' && (
                <Button className="w-full" disabled={loading} onClick={handlePost}>
                  Post Entry
                </Button>
              )}
              {entry.status === 'POSTED' && !reverseMode && (
                <Button className="w-full" variant="danger" disabled={loading} onClick={() => setReverseMode(true)}>
                  Reverse Entry
                </Button>
              )}
              {entry.status === 'POSTED' && reverseMode && (
                <div className="space-y-3">
                  <Input
                    label="Reversal reason (required)"
                    value={reverseReason}
                    onChange={(e) => setReverseReason(e.target.value)}
                    placeholder="Why is this entry being reversed?"
                  />
                  <div className="flex gap-2">
                    <Button className="flex-1" variant="danger" disabled={loading || reverseReason.trim().length < 3} onClick={handleReverse}>
                      Confirm Reversal
                    </Button>
                    <Button variant="secondary" disabled={loading} onClick={() => setReverseMode(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {['POSTED', 'REVERSED'].includes(entry.status) && (
                <p className="text-xs text-gray-500">
                  {entry.status === 'POSTED'
                    ? 'Posted entries are immutable. Reversals are the only correction mechanism.'
                    : 'This entry was reversed. The mirrored correcting entry now nets it to zero.'}
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

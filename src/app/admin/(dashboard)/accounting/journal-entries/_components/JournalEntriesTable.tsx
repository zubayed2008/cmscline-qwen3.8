'use client';

import { useRouter } from 'next/navigation';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/features/admin/accounting/StatusBadge';
import MoneyDisplay from '@/components/features/admin/accounting/MoneyDisplay';

interface JournalEntryItem {
  id: string;
  entryNumber: string;
  entryDate: string;
  memo: string | null;
  status: string;
  sourceType: string;
  totalDebit: string;
  totalCredit: string;
  createdByName: string | null;
}

export default function JournalEntriesTable({
  initialEntries,
}: {
  initialEntries: JournalEntryItem[];
}) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">All Journal Entries</h2>
      </CardHeader>
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Memo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {initialEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No journal entries yet.
                  </td>
                </tr>
              ) : (
                initialEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{entry.entryNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{entry.entryDate}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[220px] truncate">{entry.memo ?? '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <MoneyDisplay value={entry.totalDebit} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <MoneyDisplay value={entry.totalCredit} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.sourceType.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/accounting/journal-entries/${entry.id}`)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

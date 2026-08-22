import Link from 'next/link';
import { requireAdmin } from '@/utils/auth';
import { JournalService } from '@/services/accounting/journal-service';
import Button from '@/components/ui/Button';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import JournalEntriesTable from './_components/JournalEntriesTable';
import { fetchAccounting, isoDate } from '../_lib/accounting-fetch';

export const dynamic = 'force-dynamic';

export default async function AccountingJournalEntriesPage() {
  await requireAdmin();
  const result = await fetchAccounting(() => JournalService.list({ limit: 200 }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
          <p className="text-sm text-gray-500 mt-1">
            Lifecycle: DRAFT → PENDING_APPROVAL → APPROVED → POSTED → REVERSED
          </p>
        </div>
        <Link href="/admin/accounting/journal-entries/new">
          <Button>Create Journal Entry</Button>
        </Link>
      </div>
      {!result.ok ? (
        <ErrorBanner message={result.message} />
      ) : (
        <JournalEntriesTable
          initialEntries={result.data.map((entry) => ({
            id: entry.id,
            entryNumber: entry.entryNumber,
            entryDate: isoDate(entry.entryDate),
            memo: entry.memo,
            status: entry.status,
            sourceType: entry.sourceType,
            totalDebit: entry.totalDebit,
            totalCredit: entry.totalCredit,
            createdByName: entry.createdByName,
          }))}
        />
      )}
    </div>
  );
}

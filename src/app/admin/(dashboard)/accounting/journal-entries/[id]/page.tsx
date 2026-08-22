import { requireAdmin } from '@/utils/auth';
import { JournalService } from '@/services/accounting/journal-service';
import { AccountService } from '@/services/accounting/account-service';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import JournalEntryDetail from '../_components/JournalEntryDetail';
import { fetchAccounting, isoDate } from '../../_lib/accounting-fetch';

export const dynamic = 'force-dynamic';

interface JournalEntryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function JournalEntryDetailPage({ params }: JournalEntryDetailPageProps) {
  await requireAdmin();
  const { id } = await params;

  const [entryResult, accountsResult] = await Promise.all([
    fetchAccounting(() => JournalService.getById(id)),
    fetchAccounting(() => AccountService.listAccounts()),
  ]);

  if (!entryResult.ok) return <ErrorBanner message={entryResult.message} />;
  if (!accountsResult.ok) return <ErrorBanner message={accountsResult.message} />;

  const { entry, lines } = entryResult.data;

  return (
    <div>
      <JournalEntryDetail
        initialEntry={{
          id: entry.id,
          entryNumber: entry.entryNumber,
          entryDate: isoDate(entry.entryDate),
          postingDate: isoDate(entry.postingDate),
          memo: entry.memo,
          reference: entry.reference,
          sourceType: entry.sourceType,
          sourceId: entry.sourceId,
          status: entry.status,
          totalDebit: entry.totalDebit,
          totalCredit: entry.totalCredit,
          version: entry.version,
          createdByName: entry.createdByName,
          postedBy: entry.postedBy,
          reversalOfId: entry.reversalOfId,
          reversalReason: entry.reversalReason,
        }}
        initialLines={lines.map((line) => ({
          id: line.id,
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          description: line.description,
          lineNumber: line.lineNumber,
        }))}
        accounts={accountsResult.data.map((account) => ({
          id: account.id,
          code: account.code,
          name: account.name,
        }))}
      />
    </div>
  );
}

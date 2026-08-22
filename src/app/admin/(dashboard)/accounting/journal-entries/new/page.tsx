import { requireAdmin } from '@/utils/auth';
import { AccountService } from '@/services/accounting/account-service';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import JournalEntryForm from '../_components/JournalEntryForm';
import { fetchAccounting } from '../../_lib/accounting-fetch';

export const metadata = {
  title: 'Create Journal Entry - Admin',
};

export default async function NewJournalEntryPage() {
  await requireAdmin();
  const result = await fetchAccounting(() => AccountService.listAccounts());

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Journal Entry</h1>
      {!result.ok ? (
        <ErrorBanner message={result.message} />
      ) : (
        <JournalEntryForm
          accounts={result.data
            .filter((account) => account.isPostable)
            .map((account) => ({
              id: account.id,
              code: account.code,
              name: account.name,
            }))}
        />
      )}
    </div>
  );
}

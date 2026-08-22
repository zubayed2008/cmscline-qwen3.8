import { requireAdmin } from '@/utils/auth';
import { AccountService } from '@/services/accounting/account-service';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import AccountForm from '../_components/AccountForm';
import { fetchAccounting } from '../../_lib/accounting-fetch';

export const metadata = {
  title: 'Create Account - Admin',
};

export default async function NewAccountPage() {
  await requireAdmin();
  const result = await fetchAccounting(() => AccountService.listAccounts());

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Account</h1>
      {!result.ok ? (
        <ErrorBanner message={result.message} />
      ) : (
        <AccountForm
          accounts={result.data.map((account) => ({
            id: account.id,
            code: account.code,
            name: account.name,
            type: account.type,
            isPostable: account.isPostable,
          }))}
        />
      )}
    </div>
  );
}

import Link from 'next/link';
import { requireAdmin } from '@/utils/auth';
import { AccountService } from '@/services/accounting/account-service';
import Button from '@/components/ui/Button';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import AccountsTable from './_components/AccountsTable';
import { fetchAccounting } from '../_lib/accounting-fetch';

export const dynamic = 'force-dynamic';

export default async function AccountingAccountsPage() {
  await requireAdmin();
  const result = await fetchAccounting(() => AccountService.listAccounts());

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Group accounts are non-postable headers; leaf accounts receive postings.
          </p>
        </div>
        <Link href="/admin/accounting/accounts/new">
          <Button>Create Account</Button>
        </Link>
      </div>
      {!result.ok ? (
        <ErrorBanner message={result.message} />
      ) : (
        <AccountsTable
          initialAccounts={result.data.map((account) => ({
            id: account.id,
            code: account.code,
            name: account.name,
            type: account.type,
            normalBalance: account.normalBalance,
            isActive: account.isActive,
            isPostable: account.isPostable,
            parentId: account.parentId,
            createdByName: account.createdByName,
          }))}
        />
      )}
    </div>
  );
}

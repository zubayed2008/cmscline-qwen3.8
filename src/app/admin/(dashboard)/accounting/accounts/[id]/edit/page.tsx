import { notFound } from 'next/navigation';
import { requireAdmin } from '@/utils/auth';
import { AccountService } from '@/services/accounting/account-service';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import AccountForm from '../../_components/AccountForm';
import { fetchAccounting } from '../../../_lib/accounting-fetch';

export const dynamic = 'force-dynamic';

interface EditAccountProps {
  params: Promise<{ id: string }>;
}

export default async function EditAccountPage({ params }: EditAccountProps) {
  await requireAdmin();
  const { id } = await params;

  const [all, single] = await Promise.all([
    fetchAccounting(() => AccountService.listAccounts()),
    fetchAccounting(async () => {
      const accounts = await AccountService.listAccounts();
      const account = accounts.find((a) => a.id === id);
      if (!account) notFound();
      return account;
    }),
  ]);

  if (!all.ok) return <ErrorBanner message={all.message} />;
  if (!single.ok) return <ErrorBanner message={single.message} />;

  const account = single.data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Account</h1>
      <AccountForm
        accounts={all.data.map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.type,
          isPostable: a.isPostable,
        }))}
        initialData={{
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          parentId: account.parentId,
          isPostable: account.isPostable,
          isActive: account.isActive,
        }}
      />
    </div>
  );
}

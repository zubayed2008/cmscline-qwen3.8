import { requireAdmin } from '@/utils/auth';
import { VendorService } from '@/services/accounting/vendor-service';
import { AccountService } from '@/services/accounting/account-service';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import BillForm from '../_components/BillForm';
import { fetchAccounting } from '../../_lib/accounting-fetch';

export const metadata = {
  title: 'Create Bill - Admin',
};

export default async function NewBillPage() {
  await requireAdmin();

  const [vendorsResult, accountsResult] = await Promise.all([
    fetchAccounting(() => VendorService.listVendors()),
    fetchAccounting(() => AccountService.listAccounts()),
  ]);

  if (!vendorsResult.ok) return <ErrorBanner message={vendorsResult.message} />;
  if (!accountsResult.ok) return <ErrorBanner message={accountsResult.message} />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Bill</h1>
      <BillForm
        vendors={vendorsResult.data.map((vendor) => ({
          id: vendor.id,
          code: vendor.code,
          name: vendor.name,
        }))}
        accounts={accountsResult.data
          .filter((account) => account.isPostable)
          .map((account) => ({ id: account.id, code: account.code, name: account.name }))}
      />
    </div>
  );
}

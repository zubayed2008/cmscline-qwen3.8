import { requireAdmin } from '@/utils/auth';
import { CustomerService } from '@/services/accounting/customer-service';
import { AccountService } from '@/services/accounting/account-service';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import InvoiceForm from '../_components/InvoiceForm';
import { fetchAccounting } from '../../_lib/accounting-fetch';

export const metadata = {
  title: 'Create Invoice - Admin',
};

export default async function NewInvoicePage() {
  await requireAdmin();

  const [customersResult, accountsResult] = await Promise.all([
    fetchAccounting(() => CustomerService.listCustomers()),
    fetchAccounting(() => AccountService.listAccounts()),
  ]);

  if (!customersResult.ok) return <ErrorBanner message={customersResult.message} />;
  if (!accountsResult.ok) return <ErrorBanner message={accountsResult.message} />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Invoice</h1>
      <InvoiceForm
        customers={customersResult.data.map((customer) => ({
          id: customer.id,
          code: customer.code,
          name: customer.name,
        }))}
        accounts={accountsResult.data
          .filter((account) => account.isPostable)
          .map((account) => ({ id: account.id, code: account.code, name: account.name }))}
      />
    </div>
  );
}

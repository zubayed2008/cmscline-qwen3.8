import Link from 'next/link';
import { requireAdmin } from '@/utils/auth';
import { InvoiceService } from '@/services/accounting/invoice-service';
import { CustomerService } from '@/services/accounting/customer-service';
import { AccountService } from '@/services/accounting/account-service';
import Button from '@/components/ui/Button';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import InvoicesTable from './_components/InvoicesTable';
import { fetchAccounting, isoDate } from '../_lib/accounting-fetch';

export const dynamic = 'force-dynamic';

export default async function AccountingInvoicesPage() {
  await requireAdmin();

  const [invoicesResult, customersResult, accountsResult] = await Promise.all([
    fetchAccounting(() => InvoiceService.list()),
    fetchAccounting(() => CustomerService.listCustomers()),
    fetchAccounting(() => AccountService.listAccounts()),
  ]);

  if (!invoicesResult.ok) return <ErrorBanner message={invoicesResult.message} />;
  if (!customersResult.ok) return <ErrorBanner message={customersResult.message} />;

  const customerNames = Object.fromEntries(
    customersResult.data.map((customer) => [customer.id, customer.name])
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">
            DRAFT → ISSUED → PARTIALLY_PAID → PAID (OVERDUE derived by due date)
          </p>
        </div>
        <Link href="/admin/accounting/invoices/new">
          <Button>Create Invoice</Button>
        </Link>
      </div>
      <InvoicesTable
        initialInvoices={invoicesResult.data.map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerId: invoice.customerId,
          issueDate: isoDate(invoice.issueDate),
          dueDate: isoDate(invoice.dueDate),
          totalAmount: invoice.totalAmount,
          balanceDue: invoice.balanceDue,
          status: invoice.status,
          version: invoice.version,
        }))}
        customerNames={customerNames}
        accounts={accountsResult.ok ? accountsResult.data.map((a) => ({ id: a.id, code: a.code, name: a.name })) : []}
      />
    </div>
  );
}

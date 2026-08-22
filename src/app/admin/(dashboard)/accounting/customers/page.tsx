import Link from 'next/link';
import { requireAdmin } from '@/utils/auth';
import { CustomerService } from '@/services/accounting/customer-service';
import Button from '@/components/ui/Button';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import CustomersTable from './_components/CustomersTable';
import { fetchAccounting } from '../_lib/accounting-fetch';

export const dynamic = 'force-dynamic';

export default async function AccountingCustomersPage() {
  await requireAdmin();
  const result = await fetchAccounting(() => CustomerService.listCustomers());

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <Link href="/admin/accounting/customers/new">
          <Button>Create Customer</Button>
        </Link>
      </div>
      {!result.ok ? (
        <ErrorBanner message={result.message} />
      ) : (
        <CustomersTable
          initialCustomers={result.data.map((customer) => ({
            id: customer.id,
            code: customer.code,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            status: customer.status,
          }))}
        />
      )}
    </div>
  );
}

import Link from 'next/link';
import { requireAdmin } from '@/utils/auth';
import { VendorService } from '@/services/accounting/vendor-service';
import Button from '@/components/ui/Button';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import VendorsTable from './_components/VendorsTable';
import { fetchAccounting } from '../_lib/accounting-fetch';

export const dynamic = 'force-dynamic';

export default async function AccountingVendorsPage() {
  await requireAdmin();
  const result = await fetchAccounting(() => VendorService.listVendors());

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
        <Link href="/admin/accounting/vendors/new">
          <Button>Create Vendor</Button>
        </Link>
      </div>
      {!result.ok ? (
        <ErrorBanner message={result.message} />
      ) : (
        <VendorsTable
          initialVendors={result.data.map((vendor) => ({
            id: vendor.id,
            code: vendor.code,
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone,
            status: vendor.status,
          }))}
        />
      )}
    </div>
  );
}

import Link from 'next/link';
import { requireAdmin } from '@/utils/auth';
import { BillService } from '@/services/accounting/bill-service';
import { VendorService } from '@/services/accounting/vendor-service';
import { AccountService } from '@/services/accounting/account-service';
import Button from '@/components/ui/Button';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import BillsTable from './_components/BillsTable';
import { fetchAccounting, isoDate } from '../_lib/accounting-fetch';

export const dynamic = 'force-dynamic';

export default async function AccountingBillsPage() {
  await requireAdmin();

  const [billsResult, vendorsResult, accountsResult] = await Promise.all([
    fetchAccounting(() => BillService.list()),
    fetchAccounting(() => VendorService.listVendors()),
    fetchAccounting(() => AccountService.listAccounts()),
  ]);

  if (!billsResult.ok) return <ErrorBanner message={billsResult.message} />;
  if (!vendorsResult.ok) return <ErrorBanner message={vendorsResult.message} />;

  const vendorNames = Object.fromEntries(
    vendorsResult.data.map((vendor) => [vendor.id, vendor.name])
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Bills</h1>
          <p className="text-sm text-gray-500 mt-1">
            DRAFT → APPROVED → POSTED → PARTIALLY_PAID → PAID
          </p>
        </div>
        <Link href="/admin/accounting/bills/new">
          <Button>Create Bill</Button>
        </Link>
      </div>
      <BillsTable
        initialBills={billsResult.data.map((bill) => ({
          id: bill.id,
          billNumber: bill.billNumber,
          vendorId: bill.vendorId,
          billDate: isoDate(bill.billDate),
          dueDate: isoDate(bill.dueDate),
          totalAmount: bill.totalAmount,
          balanceDue: bill.balanceDue,
          status: bill.status,
          version: bill.version,
        }))}
        vendorNames={vendorNames}
        accounts={accountsResult.ok ? accountsResult.data.map((a) => ({ id: a.id, code: a.code, name: a.name })) : []}
      />
    </div>
  );
}

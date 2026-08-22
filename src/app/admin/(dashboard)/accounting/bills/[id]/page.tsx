import { requireAdmin } from '@/utils/auth';
import { BillService } from '@/services/accounting/bill-service';
import { VendorService } from '@/services/accounting/vendor-service';
import { AccountService } from '@/services/accounting/account-service';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import BillDetail from '../_components/BillDetail';
import { fetchAccounting, isoDate } from '../../_lib/accounting-fetch';

export const dynamic = 'force-dynamic';

interface BillDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BillDetailPage({ params }: BillDetailPageProps) {
  await requireAdmin();
  const { id } = await params;

  const [billResult, accountsResult] = await Promise.all([
    fetchAccounting(() => BillService.getById(id)),
    fetchAccounting(() => AccountService.listAccounts()),
  ]);

  if (!billResult.ok) return <ErrorBanner message={billResult.message} />;
  if (!accountsResult.ok) return <ErrorBanner message={accountsResult.message} />;

  const { bill, lines } = billResult.data;
  const vendorResult = await fetchAccounting(() => VendorService.getById(bill.vendorId));

  return (
    <BillDetail
      initialBill={{
        id: bill.id,
        billNumber: bill.billNumber,
        vendorId: bill.vendorId,
        billDate: isoDate(bill.billDate),
        dueDate: isoDate(bill.dueDate),
        subtotal: bill.subtotal,
        taxAmount: bill.taxAmount,
        totalAmount: bill.totalAmount,
        amountPaid: bill.amountPaid,
        balanceDue: bill.balanceDue,
        status: bill.status,
        version: bill.version,
        notes: bill.notes,
      }}
      initialLines={lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        taxAmount: line.taxAmount,
        lineTotal: line.lineTotal,
      }))}
      vendorName={vendorResult.ok ? vendorResult.data.name : 'Unknown vendor'}
      accounts={accountsResult.data.map((account) => ({
        id: account.id,
        code: account.code,
        name: account.name,
      }))}
    />
  );
}

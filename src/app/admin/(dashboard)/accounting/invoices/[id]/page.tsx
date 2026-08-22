import { requireAdmin } from '@/utils/auth';
import { InvoiceService } from '@/services/accounting/invoice-service';
import { CustomerService } from '@/services/accounting/customer-service';
import { AccountService } from '@/services/accounting/account-service';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import InvoiceDetail from '../_components/InvoiceDetail';
import { fetchAccounting, isoDate } from '../../_lib/accounting-fetch';

export const dynamic = 'force-dynamic';

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  await requireAdmin();
  const { id } = await params;

  const [invoiceResult, accountsResult] = await Promise.all([
    fetchAccounting(() => InvoiceService.getById(id)),
    fetchAccounting(() => AccountService.listAccounts()),
  ]);

  if (!invoiceResult.ok) return <ErrorBanner message={invoiceResult.message} />;
  if (!accountsResult.ok) return <ErrorBanner message={accountsResult.message} />;

  const { invoice, lines } = invoiceResult.data;
  const customerResult = await fetchAccounting(() => CustomerService.getById(invoice.customerId));

  return (
    <InvoiceDetail
      initialInvoice={{
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        issueDate: isoDate(invoice.issueDate),
        dueDate: isoDate(invoice.dueDate),
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        totalAmount: invoice.totalAmount,
        amountPaid: invoice.amountPaid,
        balanceDue: invoice.balanceDue,
        status: invoice.status,
        version: invoice.version,
        notes: invoice.notes,
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
      customerName={customerResult.ok ? customerResult.data.name : 'Unknown customer'}
      accounts={accountsResult.data.map((account) => ({
        id: account.id,
        code: account.code,
        name: account.name,
      }))}
    />
  );
}

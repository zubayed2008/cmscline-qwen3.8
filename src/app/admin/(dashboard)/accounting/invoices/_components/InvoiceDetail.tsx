'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/features/admin/accounting/StatusBadge';
import MoneyDisplay from '@/components/features/admin/accounting/MoneyDisplay';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import RecordPaymentModal from './RecordPaymentModal';

interface InvoiceLine {
  id: string;
  description: string | null;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  taxAmount: string;
  lineTotal: string;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string | null;
  customerId: string;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  status: string;
  version: number;
  notes: string | null;
}

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface InvoiceDetailProps {
  initialInvoice: InvoiceItem;
  initialLines: InvoiceLine[];
  customerName: string;
  accounts: AccountOption[];
}

export default function InvoiceDetail({
  initialInvoice,
  initialLines,
  customerName,
  accounts,
}: InvoiceDetailProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceItem>(initialInvoice);
  const [lines, setLines] = useState<InvoiceLine[]>(initialLines);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const refetch = async () => {
    const res = await fetch(`/api/invoices/${invoice.id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to reload invoice');
      return;
    }
    setInvoice(data.data.invoice);
    setLines(data.data.lines);
    router.refresh();
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this draft? Nothing financial has been recorded yet.')) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Cancel failed');
        return;
      }
      setSuccess('Invoice cancelled.');
      await refetch();
    } catch {
      setError('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const openStatuses = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber ?? 'Draft Invoice'}</h1>
          <StatusBadge status={invoice.status} />
        </div>
        <Link href="/admin/accounting/invoices" className="text-sm text-blue-600 hover:underline">
          ← Back to invoices
        </Link>
      </div>

      {error && <ErrorBanner message={error} />}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Lines</h2>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lines.map((line) => (
                    <tr key={line.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{line.description ?? '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">{line.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                        <MoneyDisplay value={line.unitPrice} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                        {Number(line.taxRate) > 0 ? `${Number(line.taxRate)}%` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        <MoneyDisplay value={line.lineTotal} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer</span>
                <span className="text-gray-900">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Issue date</span>
                <span className="text-gray-900">{invoice.issueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Due date</span>
                <span className="text-gray-900">{invoice.dueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900"><MoneyDisplay value={invoice.subtotal} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span className="text-gray-900"><MoneyDisplay value={invoice.taxAmount} /></span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900"><MoneyDisplay value={invoice.totalAmount} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paid</span>
                <span className="text-gray-900"><MoneyDisplay value={invoice.amountPaid} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Balance due</span>
                <span className="text-gray-900"><MoneyDisplay value={invoice.balanceDue} /></span>
              </div>
              {invoice.notes && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Notes</span>
                  <span className="text-gray-900 text-right">{invoice.notes}</span>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {invoice.status === 'DRAFT' && (
                <Button className="w-full" variant="danger" disabled={loading} onClick={handleCancel}>
                  Cancel Draft
                </Button>
              )}
              {openStatuses.includes(invoice.status) && (
                <Button className="w-full" disabled={loading} onClick={() => setPaymentOpen(true)}>
                  Record Payment
                </Button>
              )}
              {invoice.status === 'PAID' && (
                <p className="text-xs text-gray-500">This invoice has been fully paid.</p>
              )}
              {['CANCELLED', 'VOIDED'].includes(invoice.status) && (
                <p className="text-xs text-gray-500">This invoice was cancelled before any financial effect.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {paymentOpen && (
        <RecordPaymentModal
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          paymentType="CUSTOMER"
          partyId={invoice.customerId}
          partyName={customerName}
          accounts={accounts}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}

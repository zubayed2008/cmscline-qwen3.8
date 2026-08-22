'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/features/admin/accounting/StatusBadge';
import MoneyDisplay from '@/components/features/admin/accounting/MoneyDisplay';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import RecordPaymentModal from '../../invoices/_components/RecordPaymentModal';

interface BillLine {
  id: string;
  description: string | null;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  taxAmount: string;
  lineTotal: string;
}

interface BillItem {
  id: string;
  billNumber: string | null;
  vendorId: string;
  billDate: string;
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

interface BillDetailProps {
  initialBill: BillItem;
  initialLines: BillLine[];
  vendorName: string;
  accounts: AccountOption[];
}

export default function BillDetail({
  initialBill,
  initialLines,
  vendorName,
  accounts,
}: BillDetailProps) {
  const router = useRouter();
  const [bill, setBill] = useState<BillItem>(initialBill);
  const [lines, setLines] = useState<BillLine[]>(initialLines);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const refetch = async () => {
    const res = await fetch(`/api/bills/${bill.id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to reload bill');
      return;
    }
    setBill(data.data.bill);
    setLines(data.data.lines);
    router.refresh();
  };

  const runAction = async (path: string, body?: Record<string, unknown>) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Action failed');
        return;
      }
      setSuccess('Action completed successfully.');
      await refetch();
    } catch {
      setError('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => runAction(`/api/bills/${bill.id}/approve`);
  const handlePost = () => runAction(`/api/bills/${bill.id}/post`);
  const handleCancel = async () => {
    if (!confirm('Cancel this bill? Only pre-post bills can be cancelled.')) return;
    await runAction(`/api/bills/${bill.id}/cancel`, { reason: 'Cancelled from admin UI' });
  };

  const openStatuses = ['POSTED', 'PARTIALLY_PAID'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{bill.billNumber ?? 'Draft Bill'}</h1>
          <StatusBadge status={bill.status} />
        </div>
        <Link href="/admin/accounting/bills" className="text-sm text-blue-600 hover:underline">
          ← Back to bills
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
                <span className="text-gray-500">Vendor</span>
                <span className="text-gray-900">{vendorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bill date</span>
                <span className="text-gray-900">{bill.billDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Due date</span>
                <span className="text-gray-900">{bill.dueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900"><MoneyDisplay value={bill.subtotal} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span className="text-gray-900"><MoneyDisplay value={bill.taxAmount} /></span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900"><MoneyDisplay value={bill.totalAmount} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paid</span>
                <span className="text-gray-900"><MoneyDisplay value={bill.amountPaid} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Balance due</span>
                <span className="text-gray-900"><MoneyDisplay value={bill.balanceDue} /></span>
              </div>
              {bill.notes && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Notes</span>
                  <span className="text-gray-900 text-right">{bill.notes}</span>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              {bill.status === 'DRAFT' && (
                <>
                  <Button className="w-full" disabled={loading} onClick={handleApprove}>
                    Approve Bill
                  </Button>
                  <Button className="w-full" variant="danger" disabled={loading} onClick={handleCancel}>
                    Cancel Draft
                  </Button>
                </>
              )}
              {bill.status === 'APPROVED' && (
                <>
                  <Button className="w-full" disabled={loading} onClick={handlePost}>
                    Post Bill
                  </Button>
                  <Button className="w-full" variant="danger" disabled={loading} onClick={handleCancel}>
                    Cancel Bill
                  </Button>
                </>
              )}
              {openStatuses.includes(bill.status) && (
                <Button className="w-full" disabled={loading} onClick={() => setPaymentOpen(true)}>
                  Record Payment
                </Button>
              )}
              {bill.status === 'PAID' && (
                <p className="text-xs text-gray-500">This bill has been fully paid.</p>
              )}
              {bill.status === 'CANCELLED' && (
                <p className="text-xs text-gray-500">This bill was cancelled before posting.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {paymentOpen && (
        <RecordPaymentModal
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          paymentType="VENDOR"
          partyId={bill.vendorId}
          partyName={vendorName}
          accounts={accounts}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}


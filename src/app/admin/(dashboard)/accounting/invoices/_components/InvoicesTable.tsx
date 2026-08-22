'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/features/admin/accounting/StatusBadge';
import MoneyDisplay from '@/components/features/admin/accounting/MoneyDisplay';
import RecordPaymentModal from './RecordPaymentModal';

interface InvoiceItem {
  id: string;
  invoiceNumber: string | null;
  customerId: string;
  issueDate: string;
  dueDate: string;
  totalAmount: string;
  balanceDue: string;
  status: string;
  version: number;
}

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface InvoicesTableProps {
  initialInvoices: InvoiceItem[];
  customerNames: Record<string, string>;
  accounts: AccountOption[];
}

const OPEN_STATUSES = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];

export default function InvoicesTable({ initialInvoices, customerNames, accounts }: InvoicesTableProps) {
  const router = useRouter();
  const invoices = initialInvoices;
  const [paymentTarget, setPaymentTarget] = useState<InvoiceItem | null>(null);

  const handlePaymentSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">All Invoices</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No invoices yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {invoice.invoiceNumber ?? 'Draft'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customerNames[invoice.customerId] ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{invoice.issueDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{invoice.dueDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <MoneyDisplay value={invoice.totalAmount} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <MoneyDisplay value={invoice.balanceDue} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {OPEN_STATUSES.includes(invoice.status) && (
                            <Button size="sm" onClick={() => setPaymentTarget(invoice)}>
                              Pay
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/accounting/invoices/${invoice.id}`)}>
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {paymentTarget && (
        <RecordPaymentModal
          open={!!paymentTarget}
          onClose={() => setPaymentTarget(null)}
          paymentType="CUSTOMER"
          partyId={paymentTarget.customerId}
          partyName={customerNames[paymentTarget.customerId] ?? 'Customer'}
          accounts={accounts}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}

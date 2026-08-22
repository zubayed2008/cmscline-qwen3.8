'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/features/admin/accounting/StatusBadge';
import MoneyDisplay from '@/components/features/admin/accounting/MoneyDisplay';
import RecordPaymentModal from '../../invoices/_components/RecordPaymentModal';

interface BillItem {
  id: string;
  billNumber: string | null;
  vendorId: string;
  billDate: string;
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

interface BillsTableProps {
  initialBills: BillItem[];
  vendorNames: Record<string, string>;
  accounts: AccountOption[];
}

const OPEN_STATUSES = ['POSTED', 'PARTIALLY_PAID'];

export default function BillsTable({ initialBills, vendorNames, accounts }: BillsTableProps) {
  const router = useRouter();
  const bills = initialBills;
  const [paymentTarget, setPaymentTarget] = useState<BillItem | null>(null);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">All Bills</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No bills yet.
                    </td>
                  </tr>
                ) : (
                  bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {bill.billNumber ?? 'Draft'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vendorNames[bill.vendorId] ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{bill.billDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{bill.dueDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <MoneyDisplay value={bill.totalAmount} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <MoneyDisplay value={bill.balanceDue} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={bill.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {OPEN_STATUSES.includes(bill.status) && (
                            <Button size="sm" onClick={() => setPaymentTarget(bill)}>
                              Pay
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/accounting/bills/${bill.id}`)}>
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
          paymentType="VENDOR"
          partyId={paymentTarget.vendorId}
          partyName={vendorNames[paymentTarget.vendorId] ?? 'Vendor'}
          accounts={accounts}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  );
}

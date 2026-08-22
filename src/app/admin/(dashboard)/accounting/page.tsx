import Link from 'next/link';
import { requireAdmin } from '@/utils/auth';
import { LedgerService } from '@/services/accounting/ledger-service';
import { JournalService } from '@/services/accounting/journal-service';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import MoneyDisplay from '@/components/features/admin/accounting/MoneyDisplay';
import StatusBadge from '@/components/features/admin/accounting/StatusBadge';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import { fetchAccounting, isoDate } from './_lib/accounting-fetch';

export const dynamic = 'force-dynamic';

const QUICK_LINKS = [
  { href: '/admin/accounting/accounts', title: 'Accounts', description: 'Chart of accounts' },
  { href: '/admin/accounting/journal-entries', title: 'Journal Entries', description: 'Post & approve entries' },
  { href: '/admin/accounting/invoices', title: 'Invoices', description: 'Issue invoices, collect payments' },
  { href: '/admin/accounting/bills', title: 'Bills', description: 'Approve & pay vendor bills' },
  { href: '/admin/accounting/customers', title: 'Customers', description: 'Customer master data' },
  { href: '/admin/accounting/vendors', title: 'Vendors', description: 'Vendor master data' },
  { href: '/admin/accounting/reports', title: 'Reports', description: 'Trial balance, P&L, balance sheet' },
  { href: '/admin/accounting/periods', title: 'Periods', description: 'Close / reopen fiscal periods' },
];

export default async function AccountingDashboardPage() {
  await requireAdmin();

  const [balanceResult, journalResult] = await Promise.all([
    fetchAccounting(() => LedgerService.balanceSheet()),
    fetchAccounting(() => JournalService.list({ limit: 5 })),
  ]);

  const balance = balanceResult.ok ? balanceResult.data : null;
  const journals = journalResult.ok ? journalResult.data : [];

  const findAccount = (code: string): string => {
    if (!balance) return '0.00';
    const all = [...balance.assets.rows, ...balance.liabilities.rows, ...balance.equity.rows];
    return all.find((row) => row.code === code)?.amount ?? '0.00';
  };

  const cash = (() => {
    const a = findAccount('1100');
    const b = findAccount('1300');
    return (Number(a) + Number(b)).toFixed(2);
  })();
  const ar = findAccount('1200');
  const ap = findAccount('2100');
  const taxPayable = findAccount('2200');

  const balanceCards = [
    { label: 'Cash & Bank', value: cash, hint: '1100 + 1300' },
    { label: 'Accounts Receivable', value: ar, hint: '1200' },
    { label: 'Accounts Payable', value: ap, hint: '2100' },
    { label: 'Tax Payable', value: taxPayable, hint: '2200' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Balance sheet as of {balance ? balance.asOf : '—'}
          {balance?.warning ? ` · ${balance.warning}` : ''}
        </p>
      </div>

      {!balanceResult.ok && <ErrorBanner message={balanceResult.message} />}
      {!journalResult.ok && <ErrorBanner message={journalResult.message} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {balanceCards.map((card) => (
          <Card key={card.label}>
            <CardBody>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                <MoneyDisplay value={card.value} />
              </p>
              <p className="mt-1 text-xs text-gray-400">Account {card.hint}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Journal Entries</h2>
            <Link href="/admin/accounting/journal-entries" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {journals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No journal entries yet.
                      </td>
                    </tr>
                  ) : (
                    journals.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{entry.entryNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{isoDate(entry.entryDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={entry.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <MoneyDisplay value={entry.totalDebit} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <MoneyDisplay value={entry.totalCredit} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Quick Links</h2>
          </CardHeader>
          <CardBody className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                >
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{link.title}</h3>
                  <p className="mt-1 text-xs text-gray-500">{link.description}</p>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import MoneyDisplay from '@/components/features/admin/accounting/MoneyDisplay';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import type {
  IAgingReport,
  IBalanceSheet,
  ILedgerRow,
  IProfitLoss,
  ITrialBalance,
} from '@/types/accounting-types';

type TabKey = 'trial-balance' | 'profit-loss' | 'balance-sheet' | 'ar-aging' | 'ap-aging' | 'ledger';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'trial-balance', label: 'Trial Balance' },
  { key: 'profit-loss', label: 'P&L' },
  { key: 'balance-sheet', label: 'Balance Sheet' },
  { key: 'ar-aging', label: 'AR Aging' },
  { key: 'ap-aging', label: 'AP Aging' },
  { key: 'ledger', label: 'General Ledger' },
];

interface GeneralLedgerData {
  items: ILedgerRow[];
  total: number;
  page: number;
  limit: number;
  totalDebit: string;
  totalCredit: string;
}

type ReportData =
  | ITrialBalance
  | IProfitLoss
  | IBalanceSheet
  | IAgingReport
  | GeneralLedgerData
  | null;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function yearStartIso(): string {
  return `${new Date().getUTCFullYear()}-01-01`;
}

export default function ReportTables() {
  const [tab, setTab] = useState<TabKey>('trial-balance');
  const [data, setData] = useState<ReportData>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [asOf, setAsOf] = useState(todayIso());
  const [from, setFrom] = useState(yearStartIso());
  const [to, setTo] = useState(todayIso());
  const [glPage, setGlPage] = useState(1);
  const [glLimit, setGlLimit] = useState(25);

  const buildUrl = (target: TabKey, overrides?: { page?: number; limit?: number }): string => {
    const base = '/api/accounting';
    const page = overrides?.page ?? glPage;
    const limit = overrides?.limit ?? glLimit;
    if (target === 'trial-balance') return `${base}/trial-balance?asOf=${asOf}`;
    if (target === 'profit-loss') return `${base}/profit-loss?from=${from}&to=${to}`;
    if (target === 'balance-sheet') return `${base}/balance-sheet?asOf=${asOf}`;
    if (target === 'ar-aging') return `${base}/ar-aging?asOf=${asOf}`;
    if (target === 'ap-aging') return `${base}/ap-aging?asOf=${asOf}`;
    return `${base}/ledger?from=${from}&to=${to}&page=${page}&limit=${limit}`;
  };

  /** Pure fetch - no state writes, safe to call from effects. */
  const fetchReport = async (
    target: TabKey,
    overrides?: { page?: number; limit?: number }
  ): Promise<ReportData> => {
    const res = await fetch(buildUrl(target, overrides));
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to load report');
    }
    return json.data as ReportData;
  };

  const load = async (target: TabKey, overrides?: { page?: number; limit?: number }) => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchReport(target, overrides));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while loading the report');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (target: TabKey) => {
    setTab(target);
    setData(null);
    void load(target);
  };

  useEffect(() => {
    let cancelled = false;
    fetchReport('trial-balance')
      .then((report) => {
        if (!cancelled) setData(report);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load the trial balance report');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? 'primary' : 'secondary'}
            onClick={() => switchTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        {(tab === 'trial-balance' || tab === 'balance-sheet' || tab === 'ar-aging' || tab === 'ap-aging') && (
          <div className="w-44">
            <Input label="As of" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </div>
        )}
        {(tab === 'profit-loss' || tab === 'ledger') && (
          <>
            <div className="w-44">
              <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="w-44">
              <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </>
        )}
        <Button variant="secondary" size="sm" disabled={loading} onClick={() => load(tab)}>
          Refresh
        </Button>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {data && tab === 'trial-balance' && <TrialBalanceTable data={data as ITrialBalance} />}
      {data && tab === 'profit-loss' && <ProfitLossTable data={data as IProfitLoss} />}
      {data && tab === 'balance-sheet' && <BalanceSheetTable data={data as IBalanceSheet} />}
      {(tab === 'ar-aging' || tab === 'ap-aging') && <AgingTable data={data as IAgingReport} />}
      {data && tab === 'ledger' && (
        <LedgerTable
          data={data as GeneralLedgerData}
          page={glPage}
          setPage={(p) => {
            setGlPage(p);
            void load('ledger', { page: p });
          }}
          setLimit={(l) => {
            setGlLimit(l);
            setGlPage(1);
            void load('ledger', { page: 1, limit: l });
          }}
        />
      )}
    </div>
  );
}

function SectionTable({
  title,
  headers,
  children,
}: {
  title: string;
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </CardHeader>
      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {headers.map((header) => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

function InfoCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${highlight ? 'text-blue-900' : 'text-gray-900'}`}>
        <MoneyDisplay value={value} />
      </p>
    </div>
  );
}

function TrialBalanceTable({ data }: { data: ITrialBalance }) {
  return (
    <div className="space-y-4">
      <SectionTable title={`Trial Balance ${data.asOf ? `as of ${data.asOf}` : '(all time)'}`} headers={['Code', 'Account', 'Type', 'Debit', 'Credit', 'Balance']}>
        {data.rows.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
              No posted activity yet.
            </td>
          </tr>
        ) : (
          data.rows.map((row) => (
            <tr key={row.accountId} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{row.code}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.type}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm"><MoneyDisplay value={row.debit} /></td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm"><MoneyDisplay value={row.credit} /></td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm"><MoneyDisplay value={row.balance} /></td>
            </tr>
          ))
        )}
      </SectionTable>
      <div
        className={`px-4 py-3 rounded-lg border text-sm font-medium ${
          data.balanced ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}
      >
        Total Debit <MoneyDisplay value={data.totalDebit} /> = Total Credit <MoneyDisplay value={data.totalCredit} /> —{' '}
        {data.balanced ? 'balanced' : 'UNBALANCED'}
      </div>
    </div>
  );
}

function ProfitLossTable({ data }: { data: IProfitLoss }) {
  return (
    <div className="space-y-4">
      <SectionTable title={`Revenue (${data.from} → ${data.to})`} headers={['Code', 'Account', 'Amount']}>
        {data.revenues.length === 0 ? (
          <tr>
            <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No revenue in this period.</td>
          </tr>
        ) : (
          data.revenues.map((row) => (
            <tr key={row.accountId} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{row.code}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm"><MoneyDisplay value={row.amount} /></td>
            </tr>
          ))
        )}
      </SectionTable>
      <SectionTable title={`Expenses (${data.from} → ${data.to})`} headers={['Code', 'Account', 'Amount']}>
        {data.expenses.length === 0 ? (
          <tr>
            <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No expenses in this period.</td>
          </tr>
        ) : (
          data.expenses.map((row) => (
            <tr key={row.accountId} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{row.code}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm"><MoneyDisplay value={row.amount} /></td>
            </tr>
          ))
        )}
      </SectionTable>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard label="Total Revenue" value={data.totalRevenue} />
        <InfoCard label="Total Expenses" value={data.totalExpenses} />
        <InfoCard label="Net Income" value={data.netIncome} highlight />
      </div>
    </div>
  );
}

function BalanceSheetTable({ data }: { data: IBalanceSheet }) {
  const renderSection = (title: string, section: IBalanceSheet['assets']) => (
    <SectionTable title={`${title} (total ${section.total})`} headers={['Code', 'Account', 'Amount']}>
      {section.rows.length === 0 ? (
        <tr>
          <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No balances.</td>
        </tr>
      ) : (
        section.rows.map((row) => (
          <tr key={row.accountId} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{row.code}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.name}</td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm"><MoneyDisplay value={row.amount} /></td>
          </tr>
        ))
      )}
    </SectionTable>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Balance Sheet as of {data.asOf}</h2>
        {data.warning && <span className="text-sm text-amber-700">{data.warning}</span>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {renderSection('Assets', data.assets)}
        {renderSection('Liabilities', data.liabilities)}
        {renderSection('Equity', data.equity)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <InfoCard label="Total Assets" value={data.totalAssets} />
        <InfoCard label="Total Liabilities + Equity" value={data.totalLiabilitiesEquity} />
        <InfoCard label="Net Income (year)" value={data.netIncome} />
        <InfoCard label="Balanced" value={data.balanced ? 'Yes' : 'No'} />
      </div>
    </div>
  );
}

function AgingTable({ data }: { data: IAgingReport }) {
  return (
    <div className="space-y-4">
      <SectionTable title={`Aging as of ${data.asOf}`} headers={['Bucket', 'Documents', 'Amount']}>
        {data.buckets.length === 0 ? (
          <tr>
            <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No open documents.</td>
          </tr>
        ) : (
          data.buckets.map((bucket) => (
            <tr key={bucket.bucket} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bucket.bucket}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{bucket.documentCount}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm"><MoneyDisplay value={bucket.amount} /></td>
            </tr>
          ))
        )}
      </SectionTable>
      <InfoCard label="Total Outstanding" value={data.total} />
    </div>
  );
}

function LedgerTable({
  data,
  page,
  setPage,
  setLimit,
}: {
  data: GeneralLedgerData;
  page: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
}) {
  const totalPages = Math.max(Math.ceil(data.total / data.limit), 1);
  return (
    <div className="space-y-4">
      <SectionTable title={`General Ledger (page ${data.page} of ${totalPages} · ${data.total} lines)`} headers={['Date', 'Entry #', 'Account', 'Memo', 'Debit', 'Credit', 'Balance']}>
        {data.items.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No postings match the filters.</td>
          </tr>
        ) : (
          data.items.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.entryDate}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{row.entryNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <span className="font-mono text-gray-500">{row.accountCode}</span> {row.accountName}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{row.memo ?? '—'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">{Number(row.debit) > 0 ? <MoneyDisplay value={row.debit} /> : '—'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">{Number(row.credit) > 0 ? <MoneyDisplay value={row.credit} /> : '—'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><MoneyDisplay value={row.balance} /></td>
            </tr>
          ))
        )}
      </SectionTable>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Prev
          </Button>
          <span className="text-sm text-gray-600">
            Page {data.page} / {totalPages} — Dr <MoneyDisplay value={data.totalDebit} /> / Cr{' '}
            <MoneyDisplay value={data.totalCredit} />
          </span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next →
          </Button>
        </div>
        <div className="w-32">
          <Input
            label="Per page"
            type="number"
            min="5"
            max="200"
            step="5"
            value={data.limit}
            onChange={(e) => setLimit(Number(e.target.value) || 25)}
          />
        </div>
      </div>
    </div>
  );
}

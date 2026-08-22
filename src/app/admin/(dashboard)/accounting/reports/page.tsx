import { requireAdmin } from '@/utils/auth';
import ReportTables from './_components/ReportTables';

export const metadata = {
  title: 'Financial Reports - Admin',
};

export default async function AccountingReportsPage() {
  await requireAdmin();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Trial Balance · Profit &amp; Loss · Balance Sheet · AR/AP Aging · General Ledger
        </p>
      </div>
      <ReportTables />
    </div>
  );
}

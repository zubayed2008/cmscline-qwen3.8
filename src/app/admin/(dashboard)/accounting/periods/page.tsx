import { requireAdmin } from '@/utils/auth';
import { PeriodService } from '@/services/accounting/period-service';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';
import PeriodsTable from './_components/PeriodsTable';
import { fetchAccounting, isoDate } from '../_lib/accounting-fetch';

export const dynamic = 'force-dynamic';

export default async function AccountingPeriodsPage() {
  await requireAdmin();
  const result = await fetchAccounting(() => PeriodService.listPeriods());

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Accounting Periods</h1>
        <p className="text-sm text-gray-500 mt-1">
          Posting is only allowed into OPEN periods. Closing/reopening is audited.
        </p>
      </div>
      {!result.ok ? (
        <ErrorBanner message={result.message} />
      ) : (
        <PeriodsTable
          initialPeriods={result.data.map((period) => ({
            id: period.id,
            name: period.name,
            fiscalYear: period.fiscalYear,
            periodNumber: period.periodNumber,
            startDate: isoDate(period.startDate),
            endDate: isoDate(period.endDate),
            status: period.status,
            closedBy: period.closedBy,
            closedAt: isoDate(period.closedAt),
          }))}
        />
      )}
    </div>
  );
}

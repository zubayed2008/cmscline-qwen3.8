'use client';

import { useState } from 'react';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/features/admin/accounting/StatusBadge';
import ErrorBanner from '@/components/features/admin/accounting/ErrorBanner';

interface PeriodItem {
  id: string;
  name: string;
  fiscalYear: number;
  periodNumber: number;
  startDate: string;
  endDate: string;
  status: string;
  closedBy: string | null;
  closedAt: string;
}

export default function PeriodsTable({ initialPeriods }: { initialPeriods: PeriodItem[] }) {
  const [periods, setPeriods] = useState<PeriodItem[]>(initialPeriods);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const refetch = async () => {
    const res = await fetch('/api/accounting/periods');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to reload periods');
      return;
    }
    setPeriods(data.data);
    setSuccess('');
  };

  const handleSeed = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch('/api/accounting/periods', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Seeding failed');
        return;
      }
      setSuccess(`Created ${data.data.created} period(s) for the current fiscal year.`);
      await refetch();
    } catch {
      setError('An error occurred while seeding periods');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (period: PeriodItem) => {
    const reason = window.prompt(`Reason for closing "${period.name}" (required):`);
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError('A reason of at least 3 characters is required');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/periods/${period.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Close failed');
        return;
      }
      setSuccess(`Period "${period.name}" closed.`);
      await refetch();
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async (period: PeriodItem) => {
    const reason = window.prompt(`Reason for reopening "${period.name}" (required):`);
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError('A reason of at least 3 characters is required');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/periods/${period.id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Reopen failed');
        return;
      }
      setSuccess(`Period "${period.name}" reopened.`);
      await refetch();
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Periods</h2>
        <Button variant="secondary" size="sm" disabled={loading} onClick={handleSeed}>
          Seed Current Year
        </Button>
      </CardHeader>
      <CardBody className="p-0">
        {error && (
          <div className="px-6 pt-4">
            <ErrorBanner message={error} />
          </div>
        )}
        {success && (
          <div className="px-6 pt-4">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No periods yet. Click &quot;Seed Current Year&quot; to create the 12 monthly periods.
                  </td>
                </tr>
              ) : (
                periods.map((period) => (
                  <tr key={period.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{period.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{period.fiscalYear}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{period.periodNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{period.startDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{period.endDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={period.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {period.status === 'OPEN' ? (
                        <Button variant="danger" size="sm" disabled={loading} onClick={() => handleClose(period)}>
                          Close
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" disabled={loading} onClick={() => handleReopen(period)}>
                          Reopen
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

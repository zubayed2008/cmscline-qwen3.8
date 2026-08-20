import AnalyticsDashboard from '@/components/features/admin/AnalyticsDashboard';

export const metadata = {
  title: 'Analytics - CMS',
  description: 'Website analytics powered by Umami Analytics',
};

export default function AnalyticsPage() {
  const umamiExternalUrl =
    process.env.NEXT_PUBLIC_UMAMI_DASHBOARD_URL ||
    process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL?.replace('/script.js', '') ||
    'http://127.0.0.1:3001';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Website traffic and performance metrics powered by Umami Analytics.
          </p>
        </div>
        <a
          href={umamiExternalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          Open Umami Dashboard ↗
        </a>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
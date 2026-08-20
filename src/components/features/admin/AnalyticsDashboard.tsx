'use client';

import { useState, useEffect, useCallback } from 'react';

interface AnalyticsStats {
  pageviews: { value: number; prev: number };
  visitors: { value: number; prev: number };
  visits: { value: number; prev: number };
  bounces: { value: number; prev: number };
  totaltime: { value: number; prev: number };
}

interface PageviewData {
  x: string;
  y: number;
}

interface AnalyticsData {
  stats: AnalyticsStats;
  active: number;
  pageviews: PageviewData[];
  period: {
    start: string;
    end: string;
  };
}

interface Website {
  id: string;
  name: string;
  domain: string;
}

function formatNumber(num: number | null | undefined): string {
  // Handle null, undefined, or NaN
  if (num == null || Number.isNaN(num)) {
    return '0';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatDuration(seconds: number | null | undefined): string {
  // Handle null, undefined, or NaN
  if (seconds == null || Number.isNaN(seconds)) {
    return '0s';
  }
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}

function calculateChange(current: number | null | undefined, previous: number | null | undefined): { value: number; isPositive: boolean } {
  // Handle null, undefined, or NaN
  const curr = current ?? 0;
  const prev = previous ?? 0;
  if (prev === 0) return { value: 0, isPositive: true };
  const change = ((curr - prev) / prev) * 100;
  return { value: Math.abs(Math.round(change)), isPositive: change >= 0 };
}

// Timeout helper for fetch requests
async function fetchWithTimeout(url: string, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Fetch websites list on mount
  useEffect(() => {
    async function fetchWebsites() {
      try {
        console.log('[Analytics] Fetching websites...');
        const res = await fetchWithTimeout('/api/analytics?type=websites', 15000);
        const json = await res.json();
        console.log('[Analytics] Websites response:', json);

        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setWebsites(json.data);
          setSelectedWebsite(json.data[0].id);
        } else {
          // No websites found - set error
          setError(
            json.error || 'No websites found in Umami. Please add a website in the Umami dashboard first.'
          );
          setLoading(false);
        }
      } catch (err) {
        console.error('[Analytics] Failed to fetch websites:', err);
        const errorMessage =
          err instanceof Error && err.name === 'AbortError'
            ? 'Request timed out. Please check if Umami is running.'
            : 'Failed to connect to Umami API. Please check your configuration.';
        setError(errorMessage);
        setLoading(false);
      } finally {
        setInitialized(true);
      }
    }
    fetchWebsites();
  }, []);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!selectedWebsite) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Analytics] Fetching analytics for website:', selectedWebsite);
      const res = await fetchWithTimeout(`/api/analytics?websiteId=${selectedWebsite}`, 30000);
      const json = await res.json();
      console.log('[Analytics] Analytics response:', json);

      if (json.success) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('[Analytics] Failed to fetch analytics:', err);
      const errorMessage =
        err instanceof Error && err.name === 'AbortError'
          ? 'Request timed out. Please check if Umami is running.'
          : err instanceof Error
            ? err.message
            : 'Failed to fetch analytics';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedWebsite]);

  // Fetch analytics when website is selected
  useEffect(() => {
    if (initialized && selectedWebsite) {
      fetchAnalytics();
      // Refresh every 60 seconds
      const interval = setInterval(fetchAnalytics, 60000);
      return () => clearInterval(interval);
    }
  }, [initialized, selectedWebsite, fetchAnalytics]);

  // Show loading state
  if (loading && !data && !error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium">Error loading analytics</h3>
        <p className="text-red-600 mt-2">{error}</p>
        <p className="text-red-600 mt-2 text-sm">
          Make sure Umami is running and the environment variables are configured correctly:
        </p>
        <ul className="text-red-600 mt-2 text-sm list-disc list-inside">
          <li>UMAMI_API_URL (default: http://127.0.0.1:3001)</li>
          <li>UMAMI_USERNAME</li>
          <li>UMAMI_PASSWORD</li>
          <li>NEXT_PUBLIC_UMAMI_WEBSITE_ID</li>
        </ul>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchAnalytics();
          }}
          className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-yellow-800 font-medium">No analytics data available</h3>
        <p className="text-yellow-600 mt-2">
          No data found. Make sure your website is receiving traffic and the tracking script is installed.
        </p>
      </div>
    );
  }

  const { stats, active, pageviews } = data;
  
  // Safe access to pageviews array
  const safePageviews = Array.isArray(pageviews) ? pageviews : [];
  
  // Safe access to stats with defaults
  const pageviewsValue = stats?.pageviews?.value ?? 0;
  const pageviewsPrev = stats?.pageviews?.prev ?? 0;
  const visitorsValue = stats?.visitors?.value ?? 0;
  const visitorsPrev = stats?.visitors?.prev ?? 0;
  const visitsValue = stats?.visits?.value ?? 0;
  const bouncesValue = stats?.bounces?.value ?? 0;
  const totaltimeValue = stats?.totaltime?.value ?? 0;
  const activeVisitors = active ?? 0;
  
  const pageviewChange = calculateChange(pageviewsValue, pageviewsPrev);
  const visitorChange = calculateChange(visitorsValue, visitorsPrev);
  const bounceRate = visitsValue > 0 ? (bouncesValue / visitsValue) * 100 : 0;
  const avgSessionTime = visitsValue > 0 ? totaltimeValue / visitsValue : 0;

  // Calculate max pageview for chart scaling
  const maxPageview = Math.max(...safePageviews.map((p) => p?.y ?? 0), 1);

  return (
    <div className="space-y-6">
      {/* Website Selector */}
      {websites.length > 1 && (
        <div className="flex items-center gap-4">
          <label htmlFor="website-select" className="text-sm font-medium text-gray-700">
            Website:
          </label>
          <select
            id="website-select"
            value={selectedWebsite}
            onChange={(e) => setSelectedWebsite(e.target.value)}
            className="rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.domain})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Active Visitors Badge */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-sm font-medium text-gray-700">
          {activeVisitors} active visitor{activeVisitors !== 1 ? 's' : ''} right now
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pageviews Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Pageviews</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(pageviewsValue)}</p>
          <div className="flex items-center mt-2">
            <span
              className={`text-sm font-medium ${pageviewChange.isPositive ? 'text-green-600' : 'text-red-600'}`}
            >
              {pageviewChange.isPositive ? '↑' : '↓'} {pageviewChange.value}%
            </span>
            <span className="text-sm text-gray-500 ml-2">vs previous period</span>
          </div>
        </div>

        {/* Visitors Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Unique Visitors</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(visitorsValue)}</p>
          <div className="flex items-center mt-2">
            <span
              className={`text-sm font-medium ${visitorChange.isPositive ? 'text-green-600' : 'text-red-600'}`}
            >
              {visitorChange.isPositive ? '↑' : '↓'} {visitorChange.value}%
            </span>
            <span className="text-sm text-gray-500 ml-2">vs previous period</span>
          </div>
        </div>

        {/* Bounce Rate Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Bounce Rate</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{bounceRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 mt-2">
            {bouncesValue} of {visitsValue} visits
          </p>
        </div>

        {/* Average Session Duration Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Avg. Session</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatDuration(avgSessionTime)}</p>
          <p className="text-sm text-gray-500 mt-2">{visitsValue} total visits</p>
        </div>
      </div>

      {/* Pageviews Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Pageviews (Last 30 Days)</h3>
        <div className="h-64 flex items-end gap-1">
          {safePageviews.map((item, index) => {
            const yValue = item?.y ?? 0;
            const height = (yValue / maxPageview) * 100;
            const date = new Date(item?.x);
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center group relative"
                style={{ height: '100%' }}
              >
                <div className="w-full flex items-end" style={{ height: '100%' }}>
                  <div
                    className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-colors"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  ></div>
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                  <p className="font-medium">{label}</p>
                  <p>{yValue} pageviews</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{safePageviews.length > 0 ? new Date(safePageviews[0]?.x).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}</span>
          <span>
            {safePageviews.length > 0 ? new Date(safePageviews[safePageviews.length - 1]?.x).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }) : '-'}
          </span>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
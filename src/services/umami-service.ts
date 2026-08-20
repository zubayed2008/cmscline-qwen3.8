/**
 * Umami Analytics Service
 * Fetches analytics data from Umami API
 */

export interface UmamiStats {
  pageviews: { value: number; prev: number };
  visitors: { value: number; prev: number };
  visits: { value: number; prev: number };
  bounces: { value: number; prev: number };
  totaltime: { value: number; prev: number };
}

export interface UmamiPageviewData {
  X: string;
  Y: number;
}

export interface UmamiWebsite {
  id: string;
  name: string;
  domain: string;
}

const UMAMI_API_URL = process.env.UMAMI_API_URL || 'http://127.0.0.1:3001';
const UMAMI_USERNAME = process.env.UMAMI_USERNAME || 'admin';
const UMAMI_PASSWORD = process.env.UMAMI_PASSWORD || 'umami';

// Token cache (24 hour expiry)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 10000; // 10 second timeout for API calls

// Helper to create fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getAuthToken(): Promise<string> {
  // Return cached token if still valid (with 5 minute buffer)
  if (cachedToken && Date.now() < tokenExpiry - 300000) {
    return cachedToken;
  }

  console.log('[Umami Service] Authenticating with Umami API at:', UMAMI_API_URL);

  const response = await fetchWithTimeout(
    `${UMAMI_API_URL}/api/auth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: UMAMI_USERNAME,
        password: UMAMI_PASSWORD,
      }),
    },
    FETCH_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to authenticate with Umami API: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.token;
  tokenExpiry = Date.now() + TOKEN_EXPIRY_MS;

  console.log('[Umami Service] Authentication successful');
  return cachedToken!;
}

async function umamiFetch<T>(endpoint: string): Promise<T> {
  const token = await getAuthToken();

  console.log('[Umami Service] Fetching:', endpoint);

  const response = await fetchWithTimeout(
    `${UMAMI_API_URL}${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
    FETCH_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Umami API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function getWebsites(): Promise<UmamiWebsite[]> {
  const result = await umamiFetch<UmamiWebsite[] | { data: UmamiWebsite[] }>('/api/websites');
  // Handle both array and wrapped response formats
  const websites = Array.isArray(result) ? result : result.data || [];
  console.log('[Umami Service] Websites found:', websites.length);
  return websites;
}

export async function getWebsiteStats(
  websiteId: string,
  startDate: Date,
  endDate: Date
): Promise<UmamiStats> {
  const start = startDate.getTime();
  const end = endDate.getTime();
  return umamiFetch<UmamiStats>(
    `/api/websites/${websiteId}/stats?startAt=${start}&endAt=${end}`
  );
}

export async function getActiveVisitors(websiteId: string): Promise<number> {
  try {
    const result = await umamiFetch<{ x: number } | number | { X: string; Y: number }[]>(
      `/api/websites/${websiteId}/active`
    );

    // Handle different response formats
    if (typeof result === 'number') {
      return result;
    }
    if (Array.isArray(result)) {
      return result.reduce((sum, item) => sum + (item.Y || 0), 0);
    }
    if (result && typeof result === 'object' && 'x' in result) {
      return result.x;
    }
    return 0;
  } catch {
    // Active visitors endpoint might not be available in all Umami versions
    return 0;
  }
}

export async function getPageviews(
  websiteId: string,
  startDate: Date,
  endDate: Date
): Promise<UmamiPageviewData[]> {
  const start = startDate.getTime();
  const end = endDate.getTime();

  try {
    const result = await umamiFetch<
      | UmamiPageviewData[]
      | { pageviews: UmamiPageviewData[] }
      | { data: UmamiPageviewData[] }
    >(`/api/websites/${websiteId}/pageviews?startAt=${start}&endAt=${end}&unit=day`);

    // Handle different response formats
    if (Array.isArray(result)) {
      return result;
    }
    if (result && typeof result === 'object') {
      if ('pageviews' in result) {
        return result.pageviews || [];
      }
      if ('data' in result) {
        return result.data || [];
      }
    }
    return [];
  } catch {
    return [];
  }
}
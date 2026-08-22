/**
 * Server-side data fetching helpers for the accounting admin screens.
 *
 * Every accounting Server page wraps its service calls in `fetchAccounting` so
 * a missing/unreachable PostgreSQL database (the deferred Docker gate) shows a
 * friendly banner instead of crashing the page. Only used inside Server
 * Components.
 */

export type FetchResult<T> = { ok: true; data: T } | { ok: false; message: string };

export async function fetchAccounting<T>(fn: () => Promise<T>): Promise<FetchResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    console.error('[accounting-admin] data fetch failed:', error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to load accounting data. Check the database connection.',
    };
  }
}

/** Serializes a Drizzle row's Date fields to ISO strings (plain-object props). */
export function isoDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  return typeof value === 'string' ? value.slice(0, 10) : value.toISOString();
}

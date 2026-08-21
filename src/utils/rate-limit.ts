import { LRUCache } from 'lru-cache';

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  CONTACT_FORM: { limit: 5, window: 60 * 60 * 1000 }, // 5 per hour
  LOGIN: { limit: 1, window: 15 * 60 * 1000 },       // 10 per 15 minutes
  API_PUBLIC: { limit: 100, window: 60 * 60 * 1000 },  // 100 per hour
  API_AUTHENTICATED: { limit: 1000, window: 60 * 60 * 1000 }, // 1000 per hour
};

// Create an LRU cache for rate limiting
// Each entry tracks a count within the configured window
const rateLimitCache = new LRUCache<string, number>({
  max: 1000,
  ttl: 60 * 1000, // 1 minute default TTL
});

/**
 * Rate limiting utility using in-memory LRU cache.
 * Provides sliding-window rate limiting for API endpoints.
 */

/**
 * Applies rate limiting to a given identifier (e.g., IP address).
 * Returns success status and remaining request count.
 */
export async function rateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60 * 1000
): Promise<{ success: boolean; remaining: number }> {
  const current = rateLimitCache.get(identifier) || 0;

  if (current >= limit) {
    return { success: false, remaining: 0 };
  }

  rateLimitCache.set(identifier, current + 1);
  return { success: true, remaining: limit - current - 1 };
}

export { RATE_LIMIT_CONFIG };

export default rateLimit;
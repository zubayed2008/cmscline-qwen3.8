import Redis from 'ioredis';

/**
 * Check if Redis caching is enabled via environment variable.
 * Set ENABLE_REDIS=true to enable Redis caching.
 */
export function isRedisEnabled(): boolean {
  return process.env.ENABLE_REDIS === 'true';
}

/**
 * Redis client instance (only created if Redis is enabled).
 */
let redisClient: Redis | null = null;

/**
 * Gets the Redis client instance.
 * Returns null if Redis is not enabled or not configured.
 */
export function getRedisClient(): Redis | null {
  if (!isRedisEnabled()) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('Redis is enabled but REDIS_URL is not configured. Redis caching will be disabled.');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('Redis: Max retry attempts reached. Disabling Redis.');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redisClient.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
    });

    // Connect lazily
    redisClient.connect().catch((error) => {
      console.error('Failed to connect to Redis:', error);
      redisClient = null;
    });

    return redisClient;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return null;
  }
}

/**
 * Cache interface for get/set operations.
 */
export interface CacheInterface {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
}

/**
 * Redis cache implementation.
 */
class RedisCache implements CacheInterface {
  private client: Redis;

  constructor(client: Redis) {
    this.client = client;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.error('Redis delPattern error:', error);
    }
  }
}

/**
 * No-op cache implementation (used when Redis is disabled).
 */
class NoOpCache implements CacheInterface {
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async set(_key: string, _value: unknown, _ttlSeconds?: number): Promise<void> {
    // No-op
  }

  async del(_key: string): Promise<void> {
    // No-op
  }

  async delPattern(_pattern: string): Promise<void> {
    // No-op
  }
}

/**
 * In-memory cache implementation (fallback when Redis is disabled).
 * Uses a simple Map with TTL support.
 */
class InMemoryCache implements CacheInterface {
  private cache = new Map<string, { value: unknown; expiry: number | null }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
    const expiry = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Gets the appropriate cache instance based on configuration.
 * - If ENABLE_REDIS=true and REDIS_URL is configured: Uses Redis
 * - If ENABLE_REDIS=false or not set: Uses in-memory cache as fallback
 */
let cacheInstance: CacheInterface | null = null;

export function getCache(): CacheInterface {
  if (cacheInstance) {
    return cacheInstance;
  }

  if (isRedisEnabled()) {
    const client = getRedisClient();
    if (client) {
      cacheInstance = new RedisCache(client);
      return cacheInstance;
    }
    console.warn('Redis enabled but client unavailable. Falling back to in-memory cache.');
  }

  // Use in-memory cache as fallback
  cacheInstance = new InMemoryCache();
  return cacheInstance;
}

/**
 * Cache key generators for common entities.
 */
export const CacheKeys = {
  pages: {
    all: 'pages:all',
    active: 'pages:active',
    byId: (id: string) => `pages:${id}`,
    bySlug: (slug: string) => `pages:slug:${slug}`,
    default: 'pages:default',
  },
  blogs: {
    all: 'blogs:all',
    active: 'blogs:active',
    byId: (id: string) => `blogs:${id}`,
    bySlug: (slug: string) => `blogs:slug:${slug}`,
  },
  navigation: {
    all: 'navigation:all',
    default: 'navigation:default',
  },
  carousels: {
    byType: (type: string) => `carousels:${type}`,
    all: 'carousels:all',
  },
  media: {
    all: 'media:all',
    byId: (id: string) => `media:${id}`,
  },
  categories: {
    all: 'categories:all',
    active: 'categories:active',
  },
  tags: {
    all: 'tags:all',
    active: 'tags:active',
  },
  serviceItems: {
    all: 'serviceItems:all',
    active: 'serviceItems:active',
  },
} as const;

/**
 * Default TTL values in seconds.
 */
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

/**
 * Invalidates cache for a specific entity type.
 */
export async function invalidateCache(entityType: keyof typeof CacheKeys): Promise<void> {
  const cache = getCache();
  const keys = CacheKeys[entityType];

  for (const key of Object.values(keys)) {
    if (typeof key === 'string') {
      await cache.del(key);
    }
  }
}

/**
 * Invalidates all cache entries.
 */
export async function invalidateAllCache(): Promise<void> {
  const cache = getCache();
  await cache.delPattern('*');
}

export default {
  isRedisEnabled,
  getRedisClient,
  getCache,
  CacheKeys,
  CacheTTL,
  invalidateCache,
  invalidateAllCache,
};
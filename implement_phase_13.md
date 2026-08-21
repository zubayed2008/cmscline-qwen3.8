# Phase 13 Implementation: Audit Logging, Caching & Rate Limiting

**Status:** ✅ COMPLETED  
**Date:** 2026-08-21

---

## Overview
This document describes the implementation of Phase 13, which adds comprehensive audit logging, optional Redis caching, and rate limiting to the Enterprise CMS. The implementation uses Mongoose watchers for automatic audit trail generation and provides a configurable caching layer that can use Redis or fall back to in-memory caching.

---

## Step 13.1: Audit Log Model

### File Created: `src/models/audit-log-model.ts`

**Purpose:** Defines the MongoDB schema for audit log entries, tracking all content changes for compliance and debugging.

### Schema Structure
```typescript
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout';

export interface IAuditLog extends Document {
  action: AuditAction;           // Type of action performed
  entityType: string;            // Type of entity (Page, Blog, User, etc.)
  entityId?: ObjectId;           // ID of the affected entity
  userId: ObjectId;              // User who performed the action
  changes?: Record<string, unknown>;  // Field changes (before/after)
  ipAddress?: string;            // Client IP address
  userAgent?: string;            // Browser user agent
  createdAt: Date;
  updatedAt: Date;
}
```

### Indexes for Efficient Queries
```typescript
auditLogSchema.index({ entityType: 1, entityId: 1 });     // Query by entity
auditLogSchema.index({ userId: 1, createdAt: -1 });       // Query by user
auditLogSchema.index({ action: 1, createdAt: -1 });       // Query by action type
auditLogSchema.index({ createdAt: -1 });                  // Recent logs
```

---

## Step 13.2: Audit Service

### File Created: `src/services/audit-service.ts`

**Purpose:** Business logic layer for audit log operations, providing methods to create, query, and manage audit logs.

### Methods
| Method | Purpose |
|--------|---------|
| `createAuditLog(input)` | Creates a new audit log entry |
| `getAuditLogs(query)` | Gets paginated audit logs with filtering |
| `getEntityAuditLogs(entityType, entityId, limit)` | Gets logs for a specific entity |
| `getUserAuditLogs(userId, limit)` | Gets logs for a specific user |
| `getRecentAuditLogs(limit)` | Gets recent logs (for dashboard) |
| `getAuditStats(days)` | Gets audit statistics (action counts, entity counts, active users) |
| `deleteOldAuditLogs(daysToKeep)` | Deletes old logs (maintenance) |

### Query Interface
```typescript
export interface AuditLogQuery {
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}
```

### Statistics Response
```typescript
async getAuditStats(days: number = 30): Promise<{
  totalLogs: number;
  logsByAction: Record<string, number>;
  logsByEntityType: Record<string, number>;
  mostActiveUsers: Array<{ userId: string; count: number }>;
}>
```

---

## Step 13.3: Audit Middleware Utilities

### File Created: `src/utils/audit-middleware.ts`

**Purpose:** Helper functions for extracting request context and creating audit logs from API requests.

### Functions
| Function | Purpose |
|----------|---------|
| `getClientIp(request)` | Extracts client IP from X-Forwarded-For or X-Real-IP headers |
| `getUserAgent(request)` | Extracts browser user agent from request |
| `createAuditLogFromRequest(request, action, entityType, additionalData)` | Creates audit log with automatic context extraction |
| `createLoginAuditLog(request, userId, success)` | Special handler for login audit (no session required) |
| `createLogoutAuditLog(request, userId)` | Creates logout audit log |
| `extractChanges(before, after)` | Compares two objects and returns changed fields |

### IP Address Extraction
```typescript
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}
```

### Change Extraction
```typescript
export function extractChanges<T extends Record<string, unknown>>(
  before: T | null,
  after: T | null
): Record<string, unknown> {
  // Compares values (handles objects/arrays by stringifying)
  // Returns { fieldName: { before: oldValue, after: newValue } }
}
```

---

## Step 13.4: Mongoose Audit Watcher

### File Created: `src/utils/audit-watcher.ts`

**Purpose:** Automatically logs all CRUD operations on Mongoose models using pre/post hooks.

### Design Pattern
The audit watcher uses Mongoose middleware hooks to intercept document operations:
- **Pre-save hook:** Marks document as create/update and tracks modified paths
- **Post-save hook:** Creates audit log after successful save
- **Pre-delete hook:** Fetches document before deletion
- **Post-delete hook:** Creates audit log after deletion
- **DeleteMany hooks:** Handles bulk delete operations

### Model to Entity Type Mapping
```typescript
const MODEL_TO_ENTITY_TYPE: Record<string, string> = {
  Page: 'Page',
  Blog: 'Blog',
  Category: 'Category',
  Tag: 'Tag',
  User: 'User',
  NavigationMenu: 'NavigationMenu',
  Media: 'Media',
  CarouselItem: 'CarouselItem',
  ServiceItem: 'ServiceItem',
  ContactSubmission: 'ContactSubmission',
};
```

### Context Management
```typescript
interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Module-level storage for current request context
let currentContext: AuditContext | null = null;

export function setAuditContext(context: AuditContext | null): void {
  currentContext = context;
}

export function getAuditContext(): AuditContext | null {
  return currentContext;
}
```

### Initialization
```typescript
export function initializeAuditWatchers(): void {
  // Only initialize once, skip on client side
  if (typeof window !== 'undefined') return;

  const models = mongoose.models;
  for (const [modelName, model] of Object.entries(models)) {
    if (MODEL_TO_ENTITY_TYPE[modelName]) {
      const schemaOptions = model.schema.options as { auditWatcherSetup?: boolean };
      if (!schemaOptions.auditWatcherSetup) {
        setupAuditWatcher(model as Model<Document>);
        schemaOptions.auditWatcherSetup = true;
      }
    }
  }
}
```

---

## Step 13.5: Optional Redis Caching Layer

### File Created: `src/utils/cache.ts`

**Purpose:** Provides a configurable caching layer that can use Redis or fall back to in-memory caching.

### Configuration
```typescript
// Enable Redis via environment variable
export function isRedisEnabled(): boolean {
  return process.env.ENABLE_REDIS === 'true';
}
```

### Cache Interface
```typescript
export interface CacheInterface {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
}
```

### Cache Implementations
| Implementation | When Used |
|----------------|-----------|
| `RedisCache` | When `ENABLE_REDIS=true` and `REDIS_URL` is configured |
| `InMemoryCache` | When Redis is disabled (default fallback) |
| `NoOpCache` | No-op implementation (unused) |

### Cache Key Generators
```typescript
export const CacheKeys = {
  pages: {
    all: 'pages:all',
    active: 'pages:active',
    byId: (id: string) => `pages:${id}`,
    bySlug: (slug: string) => `pages:slug:${slug}`,
    default: 'pages:default',
  },
  blogs: { /* ... */ },
  navigation: { /* ... */ },
  carousels: { /* ... */ },
  media: { /* ... */ },
  categories: { /* ... */ },
  tags: { /* ... */ },
  serviceItems: { /* ... */ },
} as const;
```

### TTL Constants
```typescript
export const CacheTTL = {
  SHORT: 60,      // 1 minute
  MEDIUM: 300,    // 5 minutes
  LONG: 3600,     // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;
```

### Cache Invalidation
```typescript
export async function invalidateCache(entityType: keyof typeof CacheKeys): Promise<void> {
  const cache = getCache();
  const keys = CacheKeys[entityType];
  for (const key of Object.values(keys)) {
    if (typeof key === 'string') {
      await cache.del(key);
    }
  }
}
```

---

## Step 13.6: Rate Limiting Utility

### File Created: `src/utils/rate-limit.ts`

**Purpose:** Provides sliding-window rate limiting using in-memory LRU cache.

### Rate Limit Configuration
```typescript
const RATE_LIMIT_CONFIG = {
  CONTACT_FORM: { limit: 5, window: 60 * 60 * 1000 },      // 5 per hour
  LOGIN: { limit: 10, window: 15 * 60 * 1000 },            // 10 per 15 minutes
  API_PUBLIC: { limit: 100, window: 60 * 60 * 1000 },      // 100 per hour
  API_AUTHENTICATED: { limit: 1000, window: 60 * 60 * 1000 }, // 1000 per hour
};
```

### Rate Limit Function
```typescript
export async function rateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60 * 1000
): Promise<{ success: boolean; remaining: number }>
```

### LRU Cache Configuration
```typescript
const rateLimitCache = new LRUCache<string, number>({
  max: 1000,
  ttl: 60 * 1000, // 1 minute default TTL
});
```

---

## Step 13.7: API Rate Limiting Middleware

### File Created: `src/middleware.ts`

**Purpose:** Next.js middleware that applies rate limiting to all API routes.

### Rate Limiting Rules
| Route Pattern | Method | Limit |
|---------------|--------|-------|
| `/api/*` | GET | 100 requests/hour |
| `/api/*` | POST/PUT/PATCH/DELETE | 1000 requests/hour |

### Exempt Routes
Routes with their own rate limiting:
- `/api/auth/*` - Handled in NextAuth route
- `/api/contact/*` - Handled in contact route

### Response Headers
```typescript
response.headers.set('X-RateLimit-Limit', config.limit.toString());
response.headers.set('X-RateLimit-Remaining', remaining.toString());
```

### 429 Response Format
```typescript
{
  success: false,
  error: 'Too many requests. Please try again later.',
  retryAfter: Math.ceil(config.window / 60000),
}
```

---

## Step 13.8: Audit Logs API Endpoint

### File Created: `src/app/api/audit-logs/route.ts`

**Endpoints:**
- `GET /api/audit-logs` - Returns paginated audit logs with filtering
- `DELETE /api/audit-logs` - Deletes old audit logs (maintenance)

### Query Parameters (GET)
| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | string | Filter by action type (create, update, delete, login, logout) |
| `entityType` | string | Filter by entity type |
| `entityId` | string | Filter by entity ID |
| `userId` | string | Filter by user ID |
| `startDate` | string | Filter logs after this date |
| `endDate` | string | Filter logs before this date |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |

### Query Parameters (DELETE)
| Parameter | Type | Description |
|-----------|------|-------------|
| `daysToKeep` | number | Days of logs to keep (default: 90, max: 365) |

### Authentication
Both endpoints require admin authentication via `requireAdmin()`.

---

## Step 13.9: Admin Audit Logs Page

### Files Created:
- `src/app/admin/(dashboard)/audit-logs/page.tsx` - Server component
- `src/app/admin/(dashboard)/audit-logs/_components/AuditLogsClient.tsx` - Client component

### Server Component Features
- Fetches initial audit logs and statistics
- Displays stats cards (total logs, create/update/delete counts)
- Passes serialized data to client component

### Client Component Features
- Filter by action type (create, update, delete, login, logout)
- Filter by entity type
- Paginated table view
- Expandable row details showing changes JSON
- Color-coded action badges

### Action Badge Colors
```typescript
const ACTION_COLORS: Record<AuditAction, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  login: 'bg-purple-100 text-purple-800',
  logout: 'bg-gray-100 text-gray-800',
};
```

---

## Step 13.10: Rate Limiting Integration

### Files Modified:
- `src/app/api/auth/[...nextauth]/route.ts` - Login rate limiting
- `src/app/api/contact/route.ts` - Contact form rate limiting

### Login Rate Limiting
```typescript
// Only apply rate limiting to login attempts (callback URLs)
async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const isLoginAttempt = url.pathname.includes('/callback/');

  if (isLoginAttempt) {
    const { success, remaining } = await rateLimit(
      `login:${ip}`,
      RATE_LIMIT_CONFIG.LOGIN.limit,
      RATE_LIMIT_CONFIG.LOGIN.window
    );
    // ... rate limit response
  }

  // For non-login POST requests (signout, etc.), pass through directly
  return handler(request);
}
```

### Contact Form Rate Limiting
```typescript
// POST /api/contact
const { success } = await rateLimit(
  `contact:${ip}`,
  RATE_LIMIT_CONFIG.CONTACT_FORM.limit,
  RATE_LIMIT_CONFIG.CONTACT_FORM.window
);
```

---

## Step 13.11: Logout Fix

### Issue
When clicking the logout button from the admin dashboard, users received the error:
```
Failed to execute 'json' on 'Response': Unexpected end of JSON input
```

### Root Cause
The custom POST handler in `src/app/api/auth/[...nextauth]/route.ts` was wrapping ALL POST requests to `/api/auth/*`, including the signout POST. The rate limiting code and response handling was interfering with NextAuth's signout response, causing the client-side `signOut` function to receive an empty or invalid JSON response.

### Solution
Modified the POST handler to only apply rate limiting to login attempts (URLs containing `/callback/`), and pass through all other POST requests (like signout) directly to the NextAuth handler without any wrapping:

```typescript
async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const isLoginAttempt = url.pathname.includes('/callback/');

  if (isLoginAttempt) {
    // Apply rate limiting only for login attempts
    // ...
  }

  // For non-login POST requests (signout, etc.), pass through directly
  return handler(request);
}
```

---

## Environment Variables

### New Variables Added to `.env.local`:

```env
# Phase 13: Audit Logging & Caching
ENABLE_REDIS=false
REDIS_URL=redis://localhost:6379

# Rate Limiting Overrides (optional)
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=100
```

| Variable | Purpose | Default |
|----------|---------|---------|
| `ENABLE_REDIS` | Enable Redis caching (`true`/`false`) | `false` |
| `REDIS_URL` | Redis connection URL | - |
| `RATE_LIMIT_WINDOW_MS` | Default rate limit window | `3600000` (1 hour) |
| `RATE_LIMIT_MAX_REQUESTS` | Default rate limit | `100` |

---

## Files Created/Modified

### New Files
```
src/models/audit-log-model.ts
src/services/audit-service.ts
src/utils/audit-middleware.ts
src/utils/audit-watcher.ts
src/utils/cache.ts
src/utils/rate-limit.ts
src/middleware.ts
src/app/api/audit-logs/route.ts
src/app/admin/(dashboard)/audit-logs/page.tsx
src/app/admin/(dashboard)/audit-logs/_components/AuditLogsClient.tsx
```

### Modified Files
```
src/models/index.ts (added AuditLog export)
src/components/features/admin/AdminSidebar.tsx (added Audit Logs link)
src/app/api/auth/[...nextauth]/route.ts (added rate limiting, fixed logout)
src/app/api/contact/route.ts (added rate limiting)
.env.local (added new environment variables)
```

---

## Problem Solving

### 1. Automatic Audit Logging
**Issue:** Need to track all content changes without modifying every service method.

**Solution:** Created Mongoose middleware hooks (`setupAuditWatcher`) that automatically intercept create, update, and delete operations on all models. The hooks track modified paths and create audit logs asynchronously.

### 2. Request Context in Mongoose Hooks
**Issue:** Mongoose hooks don't have access to the HTTP request context (user ID, IP, user agent).

**Solution:** Created a module-level `currentContext` variable that API routes set before performing database operations. The audit watcher reads this context when creating audit logs.

### 3. Optional Redis Caching
**Issue:** Redis may not be available in all environments (development, testing, small deployments).

**Solution:** Created a cache abstraction with `CacheInterface` and multiple implementations:
- `RedisCache` - Used when `ENABLE_REDIS=true` and Redis is available
- `InMemoryCache` - Fallback when Redis is disabled
- `getCache()` factory function automatically selects the appropriate implementation

### 4. Rate Limiting Without Breaking Logout
**Issue:** Custom POST handler was interfering with NextAuth's signout response.

**Solution:** Check the URL pathname to identify login attempts (`/callback/`) and only apply rate limiting to those. All other POST requests (signout, etc.) pass through directly to the NextAuth handler.

### 5. Login Rate Limit Value
**Issue:** Comment said "10 per 15 minutes" but code had limit of 1.

**Solution:** Corrected the `RATE_LIMIT_CONFIG.LOGIN.limit` from 1 to 10 to match the intended behavior.

---

## Verification

### Build Status
```
✓ Compiled successfully
✓ Finished TypeScript check
✓ Collecting page data
✓ Generating static pages
```

### New Routes Verified
- `/admin/audit-logs` - Admin audit logs page
- `/api/audit-logs` - Audit logs API endpoint

### Test Results
```
Test Suites: 10 passed, 10 total
Tests:       161 passed, 161 total
```

### Feature Verification Checklist
1. **Audit Log Model:** Schema with action, entityType, entityId, userId, changes, ipAddress, userAgent
2. **Audit Service:** Methods for creating, querying, and managing audit logs
3. **Audit Middleware:** Request context extraction (IP, user agent, user ID)
4. **Audit Watcher:** Automatic logging on create/update/delete operations
5. **Redis Caching:** Optional Redis with in-memory fallback
6. **Rate Limiting:** LRU cache-based sliding window rate limiting
7. **API Middleware:** Rate limiting for all API routes
8. **Login Rate Limiting:** 10 attempts per 15 minutes
9. **Contact Form Rate Limiting:** 5 submissions per hour
10. **Audit Logs API:** GET/DELETE endpoints with admin authentication
11. **Audit Logs Page:** Stats cards, filters, paginated table, expandable details
12. **Logout Fix:** Signout requests pass through without interference

---

## Next Steps for Production

1. Enable Redis in production for better caching performance
2. Configure appropriate Redis TTL values based on traffic patterns
3. Set up audit log retention policy (automatic deletion of old logs)
4. Add audit log export functionality (CSV, JSON)
5. Implement real-time audit log notifications for critical actions
6. Add rate limit exception lists for trusted IPs
7. Consider using Redis for rate limiting (distributed rate limiting across multiple servers)
8. Add audit log search and advanced filtering
9. Implement audit log archiving to cold storage
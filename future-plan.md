# Future Plan: Enterprise CMS Enhancements

## Overview

This document outlines the planned enhancements to transform the current Enterprise CMS into a production-ready, feature-complete blueprint. The features are organized into logical phases based on priority and dependencies.

---

## Phase 8: Testing & Quality Assurance

### 8.1 E2E Testing with Playwright

**Goal:** Automate browser workflows to verify critical user paths, admin management, and form submissions.

**Files to Create:**
```
e2e/
├── public-smoke.spec.ts       # Homepage renders carousels, services, contact
├── admin-auth.spec.ts         # Admin authentication flow
├── contact-form.spec.ts       # Contact form validation and submission
├── page-management.spec.ts    # Page CRUD operations
├── blog-management.spec.ts    # Blog CRUD operations
└── fixtures/
    └── test-data.ts           # Shared test data and helpers
```

**Test Scenarios:**

| Test File | Coverage |
|-----------|----------|
| `public-smoke.spec.ts` | Homepage loads, carousels render, services display, contact form visible |
| `admin-auth.spec.ts` | Login page renders, valid login succeeds, invalid login fails, protected routes redirect |
| `contact-form.spec.ts` | Form validation, successful submission, error handling |
| `page-management.spec.ts` | Create page, edit page, toggle active, set default homepage |
| `blog-management.spec.ts` | Create blog with category/tags, edit, toggle active |

**Dependencies:**
```bash
npm install -D @playwright/test
npx playwright install
```

**Configuration:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Phase 9: Media & Content Enhancement

### 9.1 Media Upload (File Upload)

**Goal:** Enable actual file upload functionality instead of URL-only media management.

**New Model Fields:**
```typescript
// Extend media-model.ts
const mediaSchema = new Schema({
  // ... existing fields
  storageType: { type: String, enum: ['url', 'upload'], default: 'url' },
  filePath: { type: String }, // For local uploads
  fileSize: { type: Number },
  dimensions: {
    width: { type: Number },
    height: { type: Number }
  },
  altText: { type: String },
  caption: { type: String }
});
```

**Files to Create/Modify:**
```
New:
├── src/utils/file-upload.ts           # Multer/file handling utilities
├── src/app/api/upload/route.ts        # Upload API endpoint
├── public/uploads/                    # Local upload directory
└── src/components/features/admin/FileUploader.tsx  # Upload UI component

Modified:
├── src/services/media-service.ts      # Add upload handling
├── src/app/admin/(dashboard)/media/new/page.tsx    # Upload form
└── src/app/admin/(dashboard)/media/_components/MediaForm.tsx
```

**Upload API Endpoint:**
```typescript
// POST /api/upload
// - Accept multipart/form-data
// - Validate file type (images, videos, documents)
// - Validate file size (configurable max)
// - Generate unique filename
// - Save to public/uploads/ or cloud storage
// - Create media record in database
```

**Storage Options:**
| Type | Implementation | Use Case |
|------|----------------|----------|
| Local | `public/uploads/` | Development, small deployments |
| Cloud (S3) | AWS SDK | Production, scalable |
| Cloud (R2) | Cloudflare SDK | Edge-distributed |

### 9.2 Image Optimization

**Goal:** Use Next.js Image component for automatic optimization.

**Changes Required:**
```typescript
// Replace <img> with <Image> in all components
import Image from 'next/image';

// Example usage
<Image
  src={media.url}
  alt={media.altText || media.filename}
  width={800}
  height={600}
  className="object-cover"
  priority={isAboveFold}
/>
```

**Files to Modify:**
- `src/components/ui/GenericCarousel.tsx`
- `src/components/features/ContactSection.tsx`
- `src/app/(public)/page.tsx`
- `src/app/(public)/blog/[slug]/page.tsx`
- All admin components displaying images

**Next.js Config Update:**
```typescript
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
};
```

---

## Phase 10: SEO & Discovery

### 10.1 SEO Implementation

**Goal:** Add comprehensive SEO features for better search engine visibility.

**Files to Create:**
```
New:
├── src/app/sitemap.ts                 # Dynamic sitemap generation
├── src/app/robots.ts                  # robots.txt configuration
├── src/components/features/seo/MetaTags.tsx  # Reusable meta component
├── src/components/features/seo/OpenGraph.tsx # OG tags component
└── src/utils/seo.ts                   # SEO helper functions

Modified:
├── src/app/(public)/page.tsx          # Add homepage metadata
├── src/app/(public)/[slug]/page.tsx   # Add page metadata
├── src/app/(public)/blog/page.tsx     # Add blog listing metadata
├── src/app/(public)/blog/[slug]/page.tsx  # Add blog post metadata
└── src/app/layout.tsx                 # Add default metadata
```

**Sitemap Generation:**
```typescript
// src/app/sitemap.ts
import { MetadataRoute } from 'next';
import PageService from '@/services/page-service';
import BlogService from '@/services/blog-service';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  const pages = await PageService.getActivePages();
  const blogs = await BlogService.getActiveBlogs();
  
  const pageUrls = pages.map((page) => ({
    url: `${baseUrl}/${page.slug === 'home' ? '' : page.slug}`,
    lastModified: page.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: page.isDefaultHomepage ? 1 : 0.8,
  }));
  
  const blogUrls = blogs.map((blog) => ({
    url: `${baseUrl}/blog/${blog.slug}`,
    lastModified: blog.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));
  
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    ...pageUrls,
    ...blogUrls,
  ];
}
```

**Robots.txt:**
```typescript
// src/app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
```

**Meta Tags Component:**
```typescript
// Usage in pages
import MetaTags from '@/components/features/seo/MetaTags';

<MetaTags
  title={page.title}
  description={excerpt}
  canonicalUrl={`${baseUrl}/${page.slug}`}
  ogImage={featuredImage?.url}
/>
```

---

## Phase 11: Advanced Content Management

### 11.1 Content Versioning

**Goal:** Track revision history for pages and blogs with ability to restore previous versions.

**New Model:**
```typescript
// src/models/content-version-model.ts
const contentVersionSchema = new Schema({
  contentType: { type: String, enum: ['page', 'blog'], required: true },
  contentId: { type: Schema.Types.ObjectId, required: true, refPath: 'contentType' },
  version: { type: Number, required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  content: { type: String, required: true },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  changeSummary: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient queries
contentVersionSchema.index({ contentType: 1, contentId: 1, version: -1 });
```

**Files to Create:**
```
New:
├── src/models/content-version-model.ts
├── src/services/version-service.ts
├── src/app/api/versions/route.ts
├── src/app/api/versions/[id]/route.ts
└── src/components/features/admin/VersionHistory.tsx
```

**UI Features:**
- Version list with diff view
- Restore to previous version button
- Change summary for each version
- Compare versions side-by-side

### 11.2 Content Scheduling

**Goal:** Allow content to be published at a specific future date.

**Model Changes:**
```typescript
// Add to page-model.ts and blog-model.ts
const pageSchema = new Schema({
  // ... existing fields
  publishAt: { type: Date },
  expireAt: { type: Date },
  status: { 
    type: String, 
    enum: ['draft', 'scheduled', 'published', 'expired'], 
    default: 'draft' 
  }
});
```

**Files to Create/Modify:**
```
New:
├── src/utils/scheduler.ts             # Cron job for scheduled publishing
├── src/app/api/cron/publish/route.ts  # Cron endpoint

Modified:
├── src/services/page-service.ts       # Add scheduling logic
├── src/services/blog-service.ts       # Add scheduling logic
├── src/app/admin/(dashboard)/pages/_components/PageForm.tsx
└── src/app/admin/(dashboard)/blogs/_components/BlogForm.tsx
```

**Scheduler Logic:**
```typescript
// Check every minute for content to publish
async function publishScheduledContent() {
  const now = new Date();
  
  // Publish pages
  await Page.updateMany(
    { status: 'scheduled', publishAt: { $lte: now } },
    { $set: { status: 'published' } }
  );
  
  // Expire content
  await Page.updateMany(
    { status: 'published', expireAt: { $lte: now } },
    { $set: { status: 'expired', isActive: false } }
  );
}
```

### 11.3 Content Workflow

**Goal:** Implement draft → review → publish approval workflow.

**Model Changes:**
```typescript
// Add to page-model.ts and blog-model.ts
const pageSchema = new Schema({
  // ... existing fields
  workflowStatus: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'rejected', 'published'],
    default: 'draft'
  },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewNotes: { type: String }
});
```

**Files to Create:**
```
New:
├── src/components/features/admin/WorkflowActions.tsx
├── src/components/features/admin/ReviewModal.tsx

Modified:
├── src/services/page-service.ts
├── src/services/blog-service.ts
├── src/app/admin/(dashboard)/pages/_components/PagesTable.tsx
└── src/app/admin/(dashboard)/blogs/_components/BlogsTable.tsx
```

**Workflow States:**
```
draft → pending_review → approved → published
                ↓
            rejected → draft
```

---

## Phase 12: Search & Discovery

### 12.1 Full-text Search

**Goal:** Implement search functionality for pages and blogs.

**Approach Options:**

| Approach | Pros | Cons |
|----------|------|------|
| MongoDB Text Index | Simple, no extra dependencies | Limited language support |
| Elasticsearch | Powerful, scalable | Additional infrastructure |
| Meilisearch | Fast, easy setup | Additional service |

**MongoDB Implementation:**
```typescript
// Add text indexes to models
pageSchema.index({ title: 'text', content: 'text' });
blogSchema.index({ title: 'text', content: 'text' });

// Search service method
async function search(query: string, type: 'page' | 'blog') {
  const Model = type === 'page' ? Page : Blog;
  return Model.find(
    { $text: { $search: query }, isActive: true },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
}
```

**Files to Create:**
```
New:
├── src/services/search-service.ts
├── src/app/api/search/route.ts
├── src/components/features/public/SearchBar.tsx
├── src/components/features/public/SearchResults.tsx
└── src/app/(public)/search/page.tsx
```

---

## Phase 13: Security & Performance

### 13.1 Rate Limiting

**Goal:** Protect API endpoints from abuse.

**Implementation:**
```typescript
// src/utils/rate-limit.ts
import { LRUCache } from 'lru-cache';

const rateLimitCache = new LRUCache({
  max: 1000,
  ttl: 60 * 1000, // 1 minute
});

export async function rateLimit(
  identifier: string,
  limit: number = 100
): Promise<{ success: boolean; remaining: number }> {
  const current = rateLimitCache.get(identifier) || 0;
  
  if (current >= limit) {
    return { success: false, remaining: 0 };
  }
  
  rateLimitCache.set(identifier, current + 1);
  return { success: true, remaining: limit - current - 1 };
}
```

**Files to Create:**
```
New:
├── src/utils/rate-limit.ts
├── src/middleware.ts                  # Next.js middleware for rate limiting

Modified:
├── src/app/api/contact/route.ts       # Apply rate limiting
├── src/app/api/auth/[...nextauth]/route.ts
```

**Rate Limit Tiers:**
| Endpoint | Limit | Window |
|----------|-------|--------|
| Contact form | 5 | 1 hour |
| Login | 10 | 15 minutes |
| API (authenticated) | 1000 | 1 hour |
| API (public) | 100 | 1 hour |

### 13.2 Audit Logging

**Goal:** Track all content changes for compliance and debugging.

**New Model:**
```typescript
// src/models/audit-log-model.ts
const auditLogSchema = new Schema({
  action: { 
    type: String, 
    enum: ['create', 'update', 'delete', 'login', 'logout'], 
    required: true 
  },
  entityType: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  changes: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now }
});

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
```

**Files to Create:**
```
New:
├── src/models/audit-log-model.ts
├── src/services/audit-service.ts
├── src/utils/audit-middleware.ts
├── src/app/admin/(dashboard)/audit-logs/page.tsx
└── src/app/api/audit-logs/route.ts
```

### 13.3 Caching Layer (Redis)

**Goal:** Improve performance with Redis caching.

**Files to Create:**
```
New:
├── src/utils/cache.ts                 # Redis client and helpers
├── docker-compose.redis.yml           # Redis container
└── src/middleware.ts                  # Cache middleware

Modified:
├── src/services/page-service.ts       # Add caching
├── src/services/blog-service.ts       # Add caching
├── src/services/navigation-service.ts # Add caching
└── src/services/carousel-service.ts   # Add caching
```

**Cache Strategy:**
```typescript
// Cache pattern for services
async function getActivePages() {
  const cacheKey = 'pages:active';
  const cached = await cache.get(cacheKey);
  
  if (cached) return JSON.parse(cached);
  
  const pages = await Page.find({ isActive: true });
  await cache.set(cacheKey, JSON.stringify(pages), 'EX', 300); // 5 min TTL
  
  return pages;
}

// Invalidate on changes
async function updatePage(id, data) {
  const page = await Page.findByIdAndUpdate(id, data, { new: true });
  await cache.del('pages:active');
  await cache.del(`pages:${id}`);
  return page;
}
```
make the redis cache configurable or optional.

---

## Phase 14: User Management

### 14.1 User Profile & Authentication Enhancements

**Goal:** Add password reset, email verification, and profile management.

**Model Changes:**
```typescript
// Add to user-model.ts
const userSchema = new Schema({
  // ... existing fields
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  emailVerificationExpiry: { type: Date },
  passwordResetToken: { type: String },
  passwordResetExpiry: { type: Date },
  lastLoginAt: { type: Date },
  profileImage: { type: String }
});
```

**Files to Create:**
```
New:
├── src/utils/email.ts                 # Email sending utility
├── src/utils/tokens.ts                # Token generation
├── src/app/(public)/verify-email/page.tsx
├── src/app/(public)/forgot-password/page.tsx
├── src/app/(public)/reset-password/page.tsx
├── src/app/admin/(dashboard)/profile/page.tsx
├── src/app/api/auth/verify-email/route.ts
├── src/app/api/auth/forgot-password/route.ts
├── src/app/api/auth/reset-password/route.ts
└── src/components/features/admin/ProfileForm.tsx

Modified:
├── src/services/user-service.ts
└── src/app/api/auth/[...nextauth]/route.ts
```

**Email Templates:**
- Welcome email with verification link
- Password reset email
- Account notification emails

---

## Phase 15: Internationalization

### 15.1 Multi-language Support (i18n)

**Goal:** Support multiple languages for content and UI.

**Approach:**
```
URL Structure:
- /en/about-us
- /es/about-us
- /fr/about-us

Or subdomain:
- en.example.com
- es.example.com
```

**Model Changes:**
```typescript
// Option 1: Separate fields per language
const pageSchema = new Schema({
  title: { 
    en: { type: String },
    es: { type: String },
    fr: { type: String }
  },
  // ... similar for other text fields
});

// Option 2: Separate collection for translations
const translationSchema = new Schema({
  entityType: { type: String },
  entityId: { type: Schema.Types.ObjectId },
  locale: { type: String },
  fields: { type: Map, of: String }
});
```

**Files to Create:**
```
New:
├── src/utils/i18n.ts                  # i18n configuration
├── src/locales/
│   ├── en/common.json
│   ├── es/common.json
│   └── fr/common.json
├── src/middleware.ts                  # Locale detection
├── src/components/providers/LocaleProvider.tsx
└── src/hooks/useLocale.ts

Modified:
├── next.config.ts                     # i18n configuration
├── All public pages
└── All UI components with text
```

**Next.js i18n Config:**
```typescript
// next.config.ts
const nextConfig = {
  i18n: {
    locales: ['en', 'es', 'fr'],
    defaultLocale: 'en',
  },
};
```

---

## Phase 16: API & Documentation

### 16.1 API Documentation (Swagger/OpenAPI)

**Goal:** Auto-generate API documentation for external integrations.

**Dependencies:**
```bash
npm install swagger-ui-react @types/swagger-ui-react
npm install -D swagger-jsdoc
```

**Files to Create:**
```
New:
├── src/app/api-docs/page.tsx          # Swagger UI page
├── src/utils/swagger.ts               # Swagger configuration
├── swagger.json                       # Generated OpenAPI spec
└── src/types/api-docs.ts              # API documentation types

Modified:
├── All API routes (add JSDoc comments)
└── next.config.ts (allow swagger-ui)
```

**JSDoc Example:**
```typescript
/**
 * @swagger
 * /api/pages:
 *   get:
 *     summary: Get all pages
 *     description: Returns a list of all pages
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Page'
 */
export async function GET(request: Request) {
  // ...
}
```

---

## Phase 17: Deployment & Infrastructure

### 17.1 Docker for Main Application

**Goal:** Containerize the Next.js application for consistent deployments.

**Files to Create:**
```
New:
├── Dockerfile                         # Multi-stage build
├── Dockerfile.dev                     # Development container
├── docker-compose.yml                 # Full stack (app + db + umami)
├── docker-compose.prod.yml            # Production configuration
├── .dockerignore
└── nginx.conf                         # Nginx reverse proxy config
```

**Dockerfile:**
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

**Docker Compose (Full Stack):**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/cms
      - NEXTAUTH_URL=http://localhost:3000
    depends_on:
      - mongo
      - umami-analytics

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  umami-analytics:
    image: ghcr.io/umami-software/umami:latest
    ports:
      - "3001:3000"
    environment:
      - DATABASE_URL=postgresql://umami:umami@umami-db:5432/umami
    depends_on:
      - umami-db

  umami-db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=umami
      - POSTGRES_USER=umami
      - POSTGRES_PASSWORD=umami
    volumes:
      - umami-db-data:/var/lib/postgresql/data

volumes:
  mongo-data:
  umami-db-data:
```

---

## Phase 18: Core Financial Accounting Engine (Double-Entry)

**Goal:** Embed a lightweight double-entry accounting engine into the CMS — Chart of Accounts, immutable journal entries & postings, AR invoicing and customer payments, AP vendor bills and payments, fiscal periods, financial reports, and an audit trail. ERP-grade mathematical integrity without ERP bloat. Single base currency.

**Source documents:** `accounting-requirement.md` (BRD) · `ACCOUNTING-IMPLEMENTATION-SPEC.md` (implementation contract — authoritative for all accounting rules) · `implementation_plan.md` (file/function-level build plan, delivered part-by-part).

### Approved Design Decisions (owner-signed)
| Decision | Value |
|---|---|
| Atomicity | MongoDB multi-document transactions when replica set available; graceful non-transactional fallback locally (documented spec deviation, gated by `REQUIRE_DB_TRANSACTIONS`) |
| Journal lifecycle | Full: DRAFT → PENDING_APPROVAL → APPROVED → POSTED → REVERSED (posted = immutable) |
| Corrections | Reversal/contra entries only — never edit or delete posted records |
| Monetary storage | Decimal128 everywhere; JS floats prohibited; scale 2, half-up rounding via centralized money utility |
| Tax | Simple tax-exclusive v1: per-line `%` rate, computed amount, seeded `2200 Tax Payable` account |
| Basis / Currency | Accrual · single base currency via `ACCOUNTING_BASE_CURRENCY` (default `USD`) |
| Fiscal periods | Calendar-year, 12 monthly periods, seeded OPEN; closing/reopening audited |
| Numbering | `JE|INV|PAY|BILL-YYYY-######` via atomic counters, annual reset, never reused |
| Sub-ledgers | Shared AR (`1200`) / AP (`2100`) control accounts; `customerId`/`vendorId` stamped on postings |
| Permissions | Admin-only enforcement now (`requireAdmin`); code organized around granular `ACCOUNTING_*` constants for later expansion |
| Idempotency | `Idempotency-Key` supported on financial mutations; duplicate keys return the original result |

### Build Parts (implemented & verified sequentially, one at a time)
| Part | Scope |
|---|---|
| 1 | Foundation: money utils, ApiError codes, models (Account, AccountingPeriod, DocumentCounter), counter & period services, CoA + fiscal-year seed |
| 2 | Journal engine: JournalEntry/Posting models, full state machine, balanced-posting validation, transactional post/reverse, ledger query API |
| 3 | Accounts Receivable: customers, invoices (issue/cancel), payments with multi-invoice allocations |
| 4 | Accounts Payable: vendors, bills (approve/post/cancel), vendor payments |
| 5 | Reporting: General Ledger, Trial Balance, P&L, Balance Sheet, AR/AP aging |
| 6 | Admin UI: accounting screens + "Financials" sidebar group |
| 7 | Hardening: optimistic locking, idempotency-key wiring, full invariant test pass, acceptance checklist |

### Files (summary)
```
src/models/accounting/*.ts                     # 10 schemas (account, period, journal-entry, posting, ...)
src/services/accounting/*.ts                   # 10 services (journal, invoice, payment, report, ...)
src/app/api/accounting/**                      # accounts, periods, journal-entries, ledger, reports
src/app/api/{invoices,payments,vendors,bills}/**  # spec §22 endpoint layout
src/app/admin/(dashboard)/accounting/**        # admin screens
src/components/features/admin/accounting/**    # feature components
src/utils/accounting/{money,api-error,with-accounting-transaction}.ts
src/types/accounting-schemas.ts                # Zod contracts (money as strings, never JSON numbers)
scripts/seed-chart-of-accounts.ts              # npm run seed:accounting
src/__tests__/services/accounting/*.test.ts    # spec §31 invariant suite
```

**New dependency:** `decimal.js` (precise arithmetic bridging Decimal128; no other packages needed).
**New env:** `ACCOUNTING_BASE_CURRENCY=USD`, `REQUIRE_DB_TRANSACTIONS=false`.

---

## Implementation Priority

| Phase | Feature | Priority | Effort | Dependencies |
|-------|---------|----------|--------|--------------|
| 8 | E2E Testing | High | Medium | None |
| 9.1 | Media Upload | High | Medium | None |
| 9.2 | Image Optimization | Medium | Low | 9.1 |
| 10.1 | SEO | High | Medium | None |
| 11.1 | Content Versioning | Medium | High | None |
| 11.2 | Content Scheduling | Medium | Medium | 11.1 |
| 11.3 | Content Workflow | Medium | Medium | 11.1 |
| 12.1 | Full-text Search | Medium | Medium | None |
| 13.1 | Rate Limiting | High | Low | None |
| 13.2 | Audit Logging | Medium | Medium | None |
| 13.3 | Caching (Redis) | Low | Medium | None |
| 14.1 | User Profile | Medium | Medium | None |
| 15.1 | i18n | Low | High | None |
| 16.1 | API Documentation | Low | Medium | None |
| 17.1 | Docker | High | Medium | None |
| 18 | Accounting Engine (Parts 1–7) | High | Very High | None (self-contained module) |

---

## Recommended Implementation Order

1. **Quick Wins (Week 1-2):**
   - Phase 10.1: SEO (sitemap, robots.txt, meta tags)
   - Phase 13.1: Rate Limiting
   - Phase 9.2: Image Optimization

2. **Core Features (Week 3-6):**
   - Phase 8: E2E Testing
   - Phase 9.1: Media Upload
   - Phase 12.1: Full-text Search
   - Phase 17.1: Docker

3. **Advanced Features (Week 7-10):**
   - Phase 11.1: Content Versioning
   - Phase 11.2: Content Scheduling
   - Phase 11.3: Content Workflow
   - Phase 13.2: Audit Logging

4. **Nice to Have (Week 11+):**
   - Phase 14.1: User Profile
   - Phase 13.3: Caching (Redis)
   - Phase 15.1: i18n
   - Phase 16.1: API Documentation

5. **Financial Module — Phase 18 (part-by-part):**
   - Accounting Engine Parts 1→7 strictly in order (see implementation_plan.md)

---

## Environment Variables (New)

```env
# Phase 9: Media Upload
NEXT_PUBLIC_MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./public/uploads

# Phase 10: SEO
NEXT_PUBLIC_SITE_URL=https://example.com

# Phase 13: Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Phase 13.3: Redis
REDIS_URL=redis://localhost:6379

# Phase 14: Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@example.com

# Phase 15: i18n
NEXT_PUBLIC_DEFAULT_LOCALE=en

# Phase 18: Accounting
ACCOUNTING_BASE_CURRENCY=USD
REQUIRE_DB_TRANSACTIONS=false
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@playwright/test": "^1.40.0",
    "swagger-ui-react": "^5.10.0",
    "swagger-jsdoc": "^6.2.8",
    "ioredis": "^5.3.2",
    "lru-cache": "^10.1.0",
    "nodemailer": "^6.9.7",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.1",
    "decimal.js": "^10.4.3"
  },
  "devDependencies": {
    "@types/multer": "^1.4.11",
    "@types/nodemailer": "^6.4.14",
    "@types/swagger-ui-react": "^4.18.3",
    "@types/swagger-jsdoc": "^6.0.4"
  }
}
```

---

## Notes

- Each phase should be implemented and tested independently
- Consider creating feature branches for each phase
- Update documentation after each phase completion
- Run existing test suite before and after each phase
- Consider backward compatibility when modifying models
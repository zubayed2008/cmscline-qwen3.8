# CMS Project Memory

## Project Overview
Enterprise Full-Stack CMS built with Next.js 16.3.1 App Router, MongoDB, and Mongoose.

## Current Status
**Phase 1: Foundation & Infrastructure - COMPLETED**
**Phase 2: Service Layer - COMPLETED**
**Phase 3: API Controllers - COMPLETED**
**Phase 4: Admin Portal - COMPLETED**
**Phase 5: Public Frontend - COMPLETED**
**Phase 5.5: Playwright E2E - NOT DONE**
**Phase 6: Final Polish & Seeding - COMPLETED**
**Phase 7: Self-Hosted Analytics (Umami) - COMPLETED**
**Phase 8: TipTap Rich Text Editor - COMPLETED**
**Phase 9: Media Upload with Cloudinary - COMPLETED**
**Phase 10: SEO & Discovery - COMPLETED**
**Phase 12: Search & Discovery - COMPLETED**
**Phase 14: User Management - COMPLETED**
**Phase 15: Internationalization (i18n) - COMPLETED**

## Tech Stack
- **Framework:** Next.js 16.3.1 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** NextAuth.js v4.24.15 (Credentials provider, JWT strategy)
- **Styling:** Tailwind CSS
- **Password Hashing:** bcryptjs
- **Testing:** Jest 30, ts-jest, ts-node
- **Rich Text Editor:** TipTap 3.30.2
- **Media Storage:** Cloudinary 2.10.1
- **Icons:** lucide-react 1.33.0
- **Analytics:** Umami (self-hosted)
- **Email:** nodemailer 6.9.7

## Directory Structure
```
/src
  /app                    # View & Controller Routing Layer
    /api                  # API route handlers
    /admin                # Admin portal (protected)
    /(public)             # Public-facing pages
  /components             # React UI components
    /ui                   # Generic reusable components
    /features             # Domain-specific components
    /editor               # TipTap editor components
  /models                 # Mongoose schemas (10 models)
  /services               # Business logic layer
    /storage              # Storage provider abstraction
  /types                  # TypeScript type extensions
  /utils                  # Shared utilities
  /hooks                  # Custom React hooks
  /__tests__              # Jest unit tests
```

## Key Features Implemented

### Phase 12: Search & Discovery
- `src/services/search/search-types.ts` - Search provider type definitions (ISearchProvider, SearchResult, SearchQuery, SearchResponse)
- `src/services/search/mongodb-search-provider.ts` - MongoDB Text Index search provider
- `src/services/search/search-provider.ts` - Search provider factory (getSearchProvider)
- `src/services/search-service.ts` - Search service (search, searchPages, searchBlogs, searchAll)
- `src/app/api/search/route.ts` - GET /api/search endpoint with Zod validation
- `src/components/features/public/SearchBar.tsx` - Client component search input
- `src/components/features/public/SearchResults.tsx` - Server component results display
- `src/app/(public)/search/page.tsx` - Search results page
- Text indexes added to page and blog models
- SearchBar integrated into PublicHeader (desktop + mobile)
- Configurable via SEARCH_PROVIDER env var (mongodb, elasticsearch, meilisearch)

### Phase 14: User Management
- `src/utils/tokens.ts` - Token generation utility (crypto-based, hashed storage)
- `src/utils/email.ts` - Email sending utility (nodemailer, SMTP)
- `src/app/api/auth/verify-email/route.ts` - Email verification endpoint
- `src/app/api/auth/forgot-password/route.ts` - Password reset request endpoint
- `src/app/api/auth/reset-password/route.ts` - Password reset endpoint
- `src/app/api/auth/profile/route.ts` - Profile GET/PUT endpoints
- `src/app/(public)/verify-email/page.tsx` - Email verification page
- `src/app/(public)/forgot-password/page.tsx` - Forgot password page
- `src/app/(public)/reset-password/page.tsx` - Reset password page
- `src/app/admin/(dashboard)/profile/page.tsx` - Admin profile page
- `src/components/features/admin/ProfileForm.tsx` - Profile form component
- Enhanced user model with emailVerified, tokens, lastLoginAt, profileImage
- User service with email verification, password reset, profile update methods
- Last login tracking in NextAuth
- Profile link in admin sidebar
- Forgot password link on login page

### Phase 15: Internationalization (i18n)
- `src/utils/i18n.ts` - i18n utility (getLocale, setLocale, t, getTranslations, formatDate, formatNumber, formatCurrency, extractLocaleFromPath, hasLocalePrefix, getSupportedLocales)
- `src/locales/{en,es,fr}/common.json` - Translation files for English, Spanish, French (namespaces: common, navigation, footer, meta, ui)
- `src/proxy.ts` - Next.js 16 proxy (formerly middleware): locale detection merged with existing rate limiting
- `src/app/api/i18n/route.ts` - GET /api/i18n endpoint to switch locale (sets cookie, redirects back)
- `src/components/providers/LocaleProvider.tsx` - Client context provider + useLocale/useLocaleText hooks
- `src/hooks/useLocale.ts` - Re-exports hooks from LocaleProvider (single source of truth)
- `src/components/features/public/LanguageSwitcher.tsx` - Client language dropdown
- `src/components/features/public/PublicHeader.tsx` - LanguageSwitcher wired into desktop + mobile nav
- `src/app/layout.tsx` - Dynamic `<html lang>` from NEXT_LOCALE cookie; restored Geist font variables
- `src/app/(public)/layout.tsx` - Passes currentLocale to PublicHeader
- Locale detection priority: NEXT_LOCALE cookie → Accept-Language header → default locale
- Next.js 16 uses `proxy.ts` (NOT middleware.tsx) for server-side logic

### Phase 15.5: Bangla Locale & Content Translation
- `src/utils/locale-config.ts` - Single source of truth: LOCALES ('en', 'es', 'fr', 'bn'), Locale type, DEFAULT_LOCALE, LOCALE_NAMES (bn: 'বাংলা'), LOCALE_MAP (incl. bn-bd/bn-in), isSupportedLocale()
- `src/locales/bn/common.json` - Full Bangla UI dictionary (common/navigation/footer/meta/ui namespaces)
- `src/utils/localized-content.ts` - resolveLocalized() per-field fallback (locale translation → English base), toTranslationsRecord(), getRequestLocale()
- Hardcoded `'en' | 'es' | 'fr'` unions removed from i18n.ts, proxy.ts, LanguageSwitcher.tsx (all consume locale-config)
- Page & Blog models: embedded `translations` Map (`{ bn: { title, content } }`) - adding locales needs no migration; text indexes extended to translations.bn.title/content
- Public pages (home, [slug], blog list/detail, search) resolve NEXT_LOCALE cookie server-side; generateMetadata is locale-aware
- Services accept optional locale param on public getters (backward-compatible; admin CRUD untouched)
- Admin PageForm/BlogForm: English | বাংলা language tabs with optional Bangla Title + RichTextEditor
- Versioning integrity: ContentVersion stores translations; restores write back only when present (pre-15.5 snapshots don't wipe translations)
- Search: locale passed through provider/service/API; results localized via resolveLocalized()
- `scripts/migrate-i18n-indexes.ts` + `npm run migrate:i18n-indexes` - REQUIRED once on existing DBs (drops old text index, recreates Bangla-aware one; idempotent)
- Noto_Sans_Bengali webfont added in layout.tsx (Bengali glyphs fall through Geist automatically)

### Phase 10: SEO & Discovery
- `src/utils/seo.ts` - SEO utility functions (generateExcerpt, generateCanonicalUrl, generateOgImageUrl, formatSeoDate, generatePageTitle, sanitizeSlug, generateBlogStructuredData, generatePageStructuredData)
- `src/components/features/seo/StructuredData.tsx` - JSON-LD structured data component
- `src/app/sitemap.ts` - Dynamic sitemap generation
- `src/app/robots.ts` - robots.txt configuration
- Enhanced metadata across all public pages (OpenGraph, Twitter cards, canonical URLs)

### Phase 9: Media Upload with Cloudinary
- `src/services/storage/storage-types.ts` - Storage provider type definitions
- `src/services/storage/cloudinary-provider.ts` - Cloudinary storage provider
- `src/services/storage/storage-provider.ts` - Storage provider factory
- `src/components/features/admin/FileUploader.tsx` - Drag-and-drop file upload
- Media upload API endpoint with validation
- Media library selector in carousel form
- Admin dashboard redesign with Lucide icons

### Phase 8: TipTap Rich Text Editor
- Extensions: carousel-extension.ts, media-extension.ts
- NodeViews: CarouselNodeView.tsx, MediaNodeView.tsx
- RichTextEditor.tsx with full toolbar
- ContentRenderer.tsx for public pages

### Phase 7: Umami Analytics
- `src/components/UmamiAnalytics.tsx` - Analytics component
- `docker-compose.umami.yml` - Docker setup

### Earlier Phases
- Admin pages for all content types
- NextAuth.js authentication
- Service layer with "single default" toggle logic
- Contact form with CAPTCHA
- Generic UI components (GenericCarousel, MapLocation, ServiceGrid, ContactSection)

## Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `NEXTAUTH_URL` - NextAuth URL
- `NEXTAUTH_SECRET` - NextAuth secret
- `NEXT_PUBLIC_SITE_URL` - Base URL for SEO
- `NEXT_PUBLIC_SITE_NAME` - Site name
- `NEXT_PUBLIC_SITE_DESCRIPTION` - Site description
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID` - Umami website ID
- `NEXT_PUBLIC_UMAMI_SCRIPT_URL` - Umami script URL
- `STORAGE_PROVIDER` - Storage backend (cloudinary)
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `CLOUDINARY_FOLDER` - Default upload folder
- `IMAGE_OPTIMIZATION_QUALITY` - Image quality
- `SEARCH_PROVIDER` - Search backend (mongodb, elasticsearch, meilisearch)
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP authentication username
- `SMTP_PASSWORD` - SMTP authentication password
- `EMAIL_FROM` - From address for outgoing emails
- `NEXT_PUBLIC_DEFAULT_LOCALE` - Default locale for i18n (fallback `en`)

## Business Rules Implemented
1. **Single Default Rule:** ✅ Implemented in PageService and NavigationService
2. **Toggle State:** ✅ All services have `getActive*` methods that filter by `isActive: true`
3. **Auth Protection:** ✅ Admin routes and API endpoints protected
4. **Email Verification:** ✅ New users require email verification
5. **Password Reset:** ✅ Users can reset passwords via email link
6. **Profile Security:** ✅ Current password required for email/password changes
7. **Search Provider:** ✅ Configurable via SEARCH_PROVIDER env var (MongoDB Text Index default)
8. **Active Content Search:** ✅ Search only returns active pages/blogs
9. **Relevance Sorting:** ✅ Results sorted by MongoDB textScore
10. **Content Localization Fallback:** ✅ Missing/blank translation falls back per-field to the English base fields (never 404s)

## Next Steps
- Phase 5.5: Playwright E2E testing (not yet done)
- Phase 8: E2E Testing with Playwright
- Phase 11: Advanced Content Management (Versioning, Scheduling, Workflow)
- Phase 13: Security & Performance (Rate Limiting, Audit Logging, Redis Caching)
- Phase 16: API & Documentation (Swagger/OpenAPI)
- Phase 17: Deployment & Infrastructure (Docker)
- Production deployment preparation
- Additional SEO features (dynamic OG images, breadcrumbs, FAQ schema)
- Search suggestions/autocomplete
- Search result highlighting
- Elasticsearch/Meilisearch providers

## Important Notes
- All models use `{ timestamps: true }` for createdAt/updatedAt
- Models check `mongoose.models.X || mongoose.model()` to prevent re-compilation in dev
- Session strategy: JWT
- Test command: `npm test`
- Coverage command: `npm run test:coverage`
- Seed command: `npm run seed`
- Tokens are hashed (SHA-256) before database storage
- Forgot-password endpoint prevents user enumeration
- MongoDB only allows ONE text index per collection
- Search provider abstraction mirrors storage provider pattern
- Next.js 16 uses `src/proxy.ts` (formerly middleware); locale detection runs there for pages and rate limiting for API routes
- i18n locale resolution priority: NEXT_LOCALE cookie → Accept-Language header → default locale
- Content translation fallback rule: translations[locale].field → original base field (per field, never fails)
- Run `npm run migrate:i18n-indexes` ONCE on any existing database after pulling Phase 15.5 (swaps old text index for the Bangla-aware one; idempotent)

## Phase 18 - Accounting Engine (PostgreSQL + Drizzle) - PARTS 1 & 2 COMPLETE
Implementation per `implementation_plan.md` (7-part delivery) and `ACCOUNTING-IMPLEMENTATION-SPEC.md`.
- **Part 1 (Infrastructure & Foundation) DONE**: dedicated `cms_accounting` PostgreSQL database on the umami-db container (compose now exposes 5432, mounts `docker/postgres-init/`, healthcheck added)
- `src/db/schema/accounting/enums.ts` - pgEnums whose value tuples MIRROR `src/types/accounting-types.ts` unions via compile-time `ENUM_UNION_GUARDS`; PAYMENT_STATUS v1 = ['COMPLETED'] (spec §12.1)
- `src/db/schema/accounting/foundation.ts` - accounts (self-FK parent_id SET NULL, unique code, CHECK normal_balance↔type), accounting_periods (unique year+period, CHECK date range), document_counters (composite docType+year)
- Migration `drizzle/accounting/0000_minor_machine_man.sql` generated via `npm run db:accounting:generate` (drizzle.config.ts, schema barrel index.ts)
- `src/db/pg-client.ts` - pooled Drizzle singleton mirroring dbConnect HMR cache pattern; getAccountingDb/getAccountingClient/closeAccountingPool; requires ACCOUNTING_DATABASE_URL outside tests
- `src/utils/money.ts` - decimal.js wrapper; ALL money is fixed 2-dp STRINGS; parseMoney rejects >2dp; add/subtract/multiply/compare/sum + MoneyFormatError
- `src/utils/accounting-errors.ts` - typed errors (Conflict/Validation/NotFound/PeriodClosed/UnbalancedEntry) + mapPgError translating SQLSTATE 23505/23503/23514/22P02/40001/40P01
- `src/types/accounting-types.ts` - all domain unions + AR/AP payload contracts (CreateInvoiceInput, RecordPaymentInput, CustomerStatementResponse, VendorStatementResponse)
- npm scripts: db:accounting:generate / migrate / studio / create / drop; env: ACCOUNTING_DATABASE_URL, ACCOUNTING_BASE_CURRENCY (.env + .env.local)
- Tests: `src/__tests__/utils/money.test.ts` (20) + `accounting-errors.test.ts` (16); suite total 233/233 across 14 suites; tsc clean; ESLint clean; production build OK
- **DEFERRED live gate** (still pending, needs Docker Desktop on user machine): `docker compose -f docker-compose.umami.yml up -d`, then `npm run db:accounting:create`, then `npm run db:accounting:migrate`
- Mongo/Mongoose code untouched

### Phase 18 - PART 2 COMPLETE (Core Journal Engine) - commit `8a7ad8b`, branch `main_accounting`
- Migration `drizzle/accounting/0001_heavy_meggan.sql`: `journal_entries` (lifecycle status enum, entryDate/postingDate, sourceType/sourceId linkage, totalDebit/totalCredit numeric(18,2), currency, optimistic-lock `version`, unique entry_number, self-FK reversalOfEntryId + reversalReason, period FK, indexes (status,entryDate desc)/(sourceType,sourceId)/(reversalOfEntryId)); `journal_postings` (CHECK exactly-one-sided amount > 0, positive line_number CHECK, entry/account FKs); `idempotency_records` (key PK, endpoint/userId/requestHash, responseStatus/responseBody jsonb, expiresAt index); accounts gained `is_postable`
- `src/db/pg-client.ts`: added `runInFinancialTransaction` wrapping `accountingDb.transaction` for native PG ACID
- `src/services/accounting/journal-service.ts` (515 lines): createDraft → updateDraft (DRAFT-only, version bump, totals recompute) → submitForApproval → approve → post (tx: status gate → open-period gate → per-line postable checks → SUM(debit)==SUM(credit) → JE + postings + counter atomic) → reverse (mirrored Dr/Cr entry, own number, cross-linked); deleteDraft; list/getById filters
- Supporting services: `number-service` (SELECT…FOR UPDATE counter lock inside caller tx → JE-2026-000001), `period-service` (12 OPEN month seeding, getOpenPeriodFor throws PERIOD_CLOSED, audited close/reopen), `account-service` (CRUD, derived normalBalance, type-change guard once postings exist, soft-deactivate, shared getPostableAccount validator), `idempotency-service` (acquire/complete + lazy expiry purge), `audit-bridge` (best-effort Mongo AuditService OUTSIDE the PG tx), `service-types` (ActorContext, AccountingTx, resolveExec)
- Tests: `src/__tests__/services/accounting/journal-service.test.ts` - 28 tests (state machine, optimistic-lock rejection, unbalanced rejection, PERIOD_CLOSED/ACCOUNT_NOT_POSTABLE/ACCOUNT_INACTIVE gates, mirror-line reversal) using chain-recording Drizzle tx stub + mocked siblings; suite total 261/261 across 15 suites; tsc clean; ESLint clean; build OK
- **Deferred from Part 2 scope → carry into Part 3 FIRST:** API routes `/api/accounting/**` (accounts, periods ± close/reopen, journal-entries ± submit/approve/post/reverse) and the spec §29 seed script (CoA + fiscal year); only `db:accounting:*` npm-script family exists (drizzle-kit based; no ts-node migrator/seeder)
### Phase 18 - PART 3 & 4 COMPLETE (Accounts Receivable + Accounts Payable) - commit PENDING (not committed)
- **Part 3 (AR, prior session, user-confirmed)**: `customers`/`invoices`/`invoice_lines`/`payments`/`payment_allocations` schemas (migration `0002_romantic_mojo`); `CustomerService`; `InvoiceService` (DRAFT→ISSUED 🔑 with JE Dr 1200 AR / Cr revenue / Cr 2200 tax; pre-issue cancel); `PaymentService.recordCustomerPayment` 🔑 (allocation ≤ balance = PAYMENT_EXCEEDS_BALANCE, Σ ≤ amount = PAYMENT_ALLOCATION_EXCEEDS_AMOUNT, FIFO by due date); routes `/api/accounting/customers`, `/api/invoices/**`, `/api/payments`; `invoice-payment.test.ts`
- **Part 4 (AP, this session)**: `vendors`/`vendor_bills`/`vendor_bill_lines` schemas; `payments` gained `vendor_id` FK + `payment_allocations` gained `vendor_bill_id` FK with exactly-one CHECK `payment_allocations_invoice_or_bill` + unique (payment_id, vendor_bill_id) (migration `0003_dear_archangel`); `VendorService` (VEN-YYYY-###### codes, soft-deactivate, statement); `BillService` (DRAFT→APPROVED→POSTED 🔑 with JE Dr expense lines / Dr 2200 tax / Cr 2100 AP, BILL-YYYY-###### at post, pre-post cancel, FIFO payment application, guarded updates); `PaymentService.recordVendorPayment` 🔑 (Dr 2100 AP / Cr cash, allocation guards, FIFO across posted bills); routes `/api/vendors/**`, `/api/bills/**` (+approve/post/cancel), `POST /api/payments` now dispatches customer vs vendor by `vendorId`/`paymentType`
- Bill unit tests (`bill-service.test.ts`) intentionally NOT written per user instruction ("do not perform unit test cases for now") - ask user to trigger later (Part 4 plan)
- Gates green: `tsc --noEmit` ✓ · ESLint ✓ (0 problems on touched files) · **278/278 tests / 16 suites** ✓ · production build ✓
- Migration `0003` committed to repo but NOT yet applied (Docker Desktop gate still deferred): compose up → `npm run db:accounting:create` → `npm run db:accounting:migrate` → seed → exercise AP flows live
- Next Part: Part 5 (Financial Reporting - General Ledger, Trial Balance, P&L, Balance Sheet, AR/AP aging; report routes under `/api/accounting/`; skip ledger tests and ask later)

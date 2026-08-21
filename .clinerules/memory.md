# CMS Project Memory - State Snapshot

## Project Overview
Enterprise CMS built with Next.js 16.3.1 App Router, MongoDB/Mongoose, TypeScript.

## ⚠️ IMPORTANT: User Preferences
- **DO NOT commit or push** unless explicitly instructed by the user.

## STRICT TOOL CALLING RULES ##
1. NO MARKDOWN WRAPPING: When outputting a tool call, output ONLY raw, valid JSON. NEVER wrap the tool call in markdown code blocks (e.g., do NOT use ```json ... ```).
2. NO YAPPING: Do not include any conversational text, explanations, or apologies before or after the tool call JSON. Output the JSON and nothing else.
3. WINDOWS PATH FORMATTING: When generating or reading file paths for Windows 11, ALWAYS use forward slashes (/) instead of backslashes (\). If you must use backslashes, you MUST properly escape them (\\) in the JSON string, otherwise the JSON parser will fail.
4. PARAMETER ACCURACY: Do not hallucinate tool parameters. If a required parameter is missing from the context, ask the user for it instead of guessing.
5. STEP-BY-STEP: If a task requires multiple tool calls, think step-by-step internally, but execute only one tool call at a time and wait for the result.


## STRICT FILE OPERATION RULES ##
1. USE CORRECT TOOLS: You ONLY have access to the following tools: `read_files`, `search_codebase`, `fetch_web_content`, `editor`, `ask_question`, `run_commands`. NEVER invent or use tool names like `write_to_file`, `replace_in_file`, or `create_file`. Use the `editor` tool for ALL file writing and editing.
2. NO CODE TRUNCATION: When using the `editor` tool to write or replace code, you MUST write the COMPLETE, FULL code. NEVER use placeholders like "// ... rest of the code" or "...". Write every single line.
3. READ BEFORE WRITE: ALWAYS use the `read_files` tool to read the current contents of a file before attempting to modify it with the `editor` tool. Never guess the current state of a file.
4. EXACT MATCHING: If you are replacing specific text using the `editor` tool, the old text must match the EXACT characters in the file, including all whitespace and indentation.
5. NO CONVERSATIONAL CODE: The content parameters must contain ONLY valid, executable code. Do not include conversational text inside the code blocks.

## Current State
Last commit: `e1e8ffc` - Phase 14: User Management.

### Recent Work (Phase 13.2 - Audit Logging & Optional Redis Caching):
- Created `src/models/audit-log-model.ts` - Audit log schema with action, entityType, entityId, userId, changes, ipAddress, userAgent fields
- Created `src/services/audit-service.ts` - Audit service (createAuditLog, getAuditLogs, getEntityAuditLogs, getUserAuditLogs, getRecentAuditLogs, getAuditStats, deleteOldAuditLogs)
- Created `src/utils/audit-middleware.ts` - Request context extraction (getClientIp, getUserAgent, createAuditLogFromRequest, createLoginAuditLog, createLogoutAuditLog, extractChanges)
- Created `src/utils/audit-watcher.ts` - Mongoose middleware for automatic audit logging on create/update/delete operations
- Created `src/utils/cache.ts` - Optional Redis caching layer with in-memory fallback (isRedisEnabled, getRedisClient, getCache, CacheKeys, CacheTTL, invalidateCache)
- Created `src/app/api/audit-logs/route.ts` - GET/DELETE /api/audit-logs endpoints (admin only)
- Created `src/app/admin/(dashboard)/audit-logs/page.tsx` - Admin audit logs page with stats cards
- Created `src/app/admin/(dashboard)/audit-logs/_components/AuditLogsClient.tsx` - Client component with filters, table, pagination, and expandable details
- Updated `src/components/features/admin/AdminSidebar.tsx` - Added Audit Logs link with ClipboardList icon
- Updated `src/models/index.ts` - Added AuditLog export
- Added environment variables: ENABLE_REDIS, REDIS_URL, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS
- Build verified successfully with /admin/audit-logs and /api/audit-logs routes
- All 161 tests pass (10 test suites)

### Recent Work (Phase 12 - Search & Discovery):
- Created `src/services/search/search-types.ts` - Search provider type definitions (ISearchProvider, SearchResult, SearchQuery, SearchResponse, SearchContentType)
- Created `src/services/search/mongodb-search-provider.ts` - MongoDB Text Index search provider with relevance scoring
- Created `src/services/search/search-provider.ts` - Search provider factory (getSearchProvider) reading SEARCH_PROVIDER env var
- Created `src/services/search-service.ts` - Search service (search, searchPages, searchBlogs, searchAll, isConfigured)
- Created `src/app/api/search/route.ts` - GET /api/search endpoint with Zod validation
- Created `src/components/features/public/SearchBar.tsx` - Client component search input
- Created `src/components/features/public/SearchResults.tsx` - Server component results display
- Created `src/app/(public)/search/page.tsx` - Search results page with dynamic metadata
- Created `src/__tests__/services/search-service.test.ts` - Search service unit tests
- Updated `src/models/page-model.ts` - Added text index on title and content
- Updated `src/models/blog-model.ts` - Added text index on title and content
- Updated `src/types/schemas.ts` - Added searchQuerySchema
- Updated `src/components/features/public/PublicHeader.tsx` - Added SearchBar to desktop and mobile nav
- Added environment variable: SEARCH_PROVIDER=mongodb
- Build verified successfully with /search and /api/search routes
- All 161 tests pass (10 test suites)

### Recent Work (Phase 14 - User Management):
- Created `src/utils/tokens.ts` - Token generation utility (crypto-based, hashed storage, expiry)
- Created `src/utils/email.ts` - Email sending utility (nodemailer, SMTP, HTML templates)
- Created `src/app/api/auth/verify-email/route.ts` - POST /api/auth/verify-email endpoint
- Created `src/app/api/auth/forgot-password/route.ts` - POST /api/auth/forgot-password endpoint (user enumeration prevention)
- Created `src/app/api/auth/reset-password/route.ts` - POST /api/auth/reset-password endpoint
- Created `src/app/api/auth/profile/route.ts` - GET/PUT /api/auth/profile endpoints
- Created `src/app/(public)/verify-email/page.tsx` - Email verification page
- Created `src/app/(public)/forgot-password/page.tsx` - Forgot password page
- Created `src/app/(public)/reset-password/page.tsx` - Reset password page
- Created `src/app/admin/(dashboard)/profile/page.tsx` - Admin profile page
- Created `src/components/features/admin/ProfileForm.tsx` - Profile form component
- Updated `src/models/user-model.ts` - Added emailVerified, emailVerificationToken, emailVerificationExpiry, passwordResetToken, passwordResetExpiry, lastLoginAt, profileImage
- Updated `src/services/user-service.ts` - Added updateProfile, trackLogin, generateEmailVerificationToken, verifyEmail, generatePasswordResetToken, resetPassword
- Updated `src/types/schemas.ts` - Added verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema, updateProfileSchema
- Updated `src/app/api/auth/[...nextauth]/route.ts` - Added lastLoginAt tracking
- Updated `src/components/features/admin/AdminSidebar.tsx` - Added Profile link with UserCircle icon
- Updated `src/app/admin/(auth)/login/page.tsx` - Added Forgot Password link
- Updated `scripts/seed.ts` - Added new user fields, default admin pre-verified
- Added dependencies: nodemailer ^6.9.7, @types/nodemailer ^6.4.14
- Added environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM
- Build verified successfully with all new routes

### Recent Work (Phase 10 - SEO & Discovery):
- Created `src/utils/seo.ts` - SEO utility functions (generateExcerpt, generateCanonicalUrl, generateOgImageUrl, formatSeoDate, generatePageTitle, sanitizeSlug, generateBlogStructuredData, generatePageStructuredData)
- Created `src/components/features/seo/StructuredData.tsx` - JSON-LD structured data component
- Created `src/app/sitemap.ts` - Dynamic sitemap generation fetching active pages and blogs
- Created `src/app/robots.ts` - robots.txt configuration disallowing /admin/, /api/, /_next/, /private/
- Updated `src/app/layout.tsx` - Enhanced default metadata with OpenGraph, Twitter cards, canonical URL, robots directives
- Updated `src/app/(public)/page.tsx` - Homepage SEO metadata and StructuredData
- Updated `src/app/(public)/[slug]/page.tsx` - Dynamic pages SEO metadata and StructuredData
- Updated `src/app/(public)/blog/[slug]/page.tsx` - Blog posts SEO metadata with featured image support and BlogPosting schema
- Added environment variables to `.env.local`: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SITE_NAME, NEXT_PUBLIC_SITE_DESCRIPTION
- Build verified successfully with /robots.txt and /sitemap.xml as static routes

### Recent Work (Phase 9 - Media Upload with Cloudinary):
- Created `src/services/storage/storage-types.ts` - Storage provider type definitions (UploadResult, UploadOptions, DeleteResult, IStorageProvider)
- Created `src/services/storage/cloudinary-provider.ts` - Cloudinary storage provider with image optimization
- Created `src/services/storage/storage-provider.ts` - Storage provider factory (getStorageProvider)
- Created `src/components/features/admin/FileUploader.tsx` - Drag-and-drop file upload component
- Updated `src/models/media-model.ts` - Added optimizedUrl, storageType, publicId, dimensions, altText, caption fields
- Updated `src/services/media-service.ts` - Added uploadMedia method, file validation (extension, MIME, size)
- Updated `src/app/api/media/upload/route.ts` - POST /api/media/upload endpoint with validation
- Updated `src/app/admin/(dashboard)/media/_components/MediaForm.tsx` - URL/Upload mode toggle, copy buttons
- Updated `src/app/admin/(dashboard)/media/_components/MediaTable.tsx` - URL details modal with copy functionality
- Updated `src/app/admin/(dashboard)/carousels/_components/CarouselForm.tsx` - Media library selector
- Updated `src/app/admin/(dashboard)/page.tsx` - Redesigned dashboard with stats cards, recent activity, quick actions
- Updated `src/components/features/admin/AdminSidebar.tsx` - Lucide React icons, categorized navigation
- Updated `src/components/features/admin/AdminHeader.tsx` - Enhanced header with branding and user info
- Added dependencies: cloudinary ^2.10.1, lucide-react ^1.33.0

### Environment Variables Required:
- `SEARCH_PROVIDER` - Search backend (default: mongodb; future: elasticsearch, meilisearch)
- `NEXT_PUBLIC_SITE_URL` - Base URL for canonical URLs, sitemap, robots.txt, OG images
- `NEXT_PUBLIC_SITE_NAME` - Site name for title templates and metadata
- `NEXT_PUBLIC_SITE_DESCRIPTION` - Default meta description
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID` - Website ID from Umami dashboard
- `NEXT_PUBLIC_UMAMI_SCRIPT_URL` - URL where Umami script is hosted (e.g., http://localhost:3001/script.js)
- `STORAGE_PROVIDER` - Storage backend (default: cloudinary)
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `CLOUDINARY_FOLDER` - Default upload folder (default: cms)
- `IMAGE_OPTIMIZATION_QUALITY` - Image quality (default: 80)
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port (587 for TLS, 465 for SSL)
- `SMTP_USER` - SMTP authentication username
- `SMTP_PASSWORD` - SMTP authentication password
- `EMAIL_FROM` - From address for outgoing emails

### Previous Fixes (not committed):
- Fixed circular reference in `src/app/(public)/page.tsx` - Mongoose subdocument `navMenu?.siteInfo` was being passed directly to `ContactSection` client component. Now explicitly extracts only serializable properties (address, phone, email).
- Fixed circular dependency in storage provider files - Extracted shared interfaces to `storage-types.ts`
- Fixed 500 error on media upload - Added placeholder Cloudinary credential detection
- Fixed Mongoose subdocument serialization error - Explicitly converts dimensions to plain objects
- Fixed TypeScript error in layout.tsx - Simplified googleBot robots config to basic index/follow

## Implementation Status

### Phase 1-6 Complete, Phase 5.5 (Playwright E2E) NOT done, Phase 7-10, 12, 14 Complete

### Key Features Implemented:
1. **Search & Discovery** (Phase 12)
   - Configurable search provider abstraction (ISearchProvider + getSearchProvider factory)
   - MongoDB Text Index provider with relevance scoring ($meta: 'textScore')
   - Search across pages and blogs (active only)
   - SearchBar in public header (desktop + mobile)
   - Search results page with type badges and excerpts
   - GET /api/search endpoint with Zod validation
   - Text indexes on page and blog models

2. **User Management** (Phase 14)
   - Email verification with hashed tokens and expiry
   - Password reset with email links
   - Profile management (name, email, profile image, password)
   - Last login tracking
   - User enumeration prevention on forgot-password
   - Current password required for sensitive changes
   - SMTP email sending with nodemailer

3. **SEO & Discovery** (Phase 10)
   - SEO utility functions in `src/utils/seo.ts`
   - StructuredData component for JSON-LD
   - Dynamic sitemap generation (`/sitemap.xml`)
   - Robots.txt configuration (`/robots.txt`)
   - Enhanced metadata across all public pages
   - OpenGraph, Twitter cards, canonical URLs

4. **Media Upload with Cloudinary** (Phase 9)
   - Storage provider abstraction (IStorageProvider interface)
   - Cloudinary integration with image optimization
   - File upload with drag-and-drop (FileUploader component)
   - Media library selector in carousel form
   - URL copy functionality in media management
   - Admin dashboard redesign with Lucide icons

5. **TipTap Rich Text Editor**
   - Extensions: carousel-extension.ts, media-extension.ts
   - NodeViews: CarouselNodeView.tsx (blue), MediaNodeView.tsx (green)
   - RichTextEditor.tsx - toolbar with bold/italic/strike/headings/lists/blockquote/link/image/undo/redo + Carousel/Media insert buttons
   - ContentRenderer.tsx - Server component rendering embedded carousels/media on public pages
   - Used in PageForm, BlogForm, page.tsx, [slug]/page.tsx, blog/[slug]/page.tsx

6. **Earlier Work:**
   - Admin pages for users, carousels, pages, blogs, navigation, media, categories, tags, service-items, contact-submissions
   - NextAuth.js authentication
   - Service layer with "single default" toggle logic
   - Contact form with CAPTCHA
   - Theme: light-only (#f9fafb background, #111827 foreground)

## Key Technical Patterns

### Search Provider (Phase 12)
- Interface: ISearchProvider (search, isConfigured)
- Factory: getSearchProvider() returns provider based on SEARCH_PROVIDER env
- MongoDB: $text search with { score: { $meta: 'textScore' } } projection and sort
- Only ONE text index per collection (compound on title + content)
- Only active content searched ({ isActive: true })
- HTML stripped from content for clean excerpts
- Combined page/blog results sorted by relevance score

### User Management (Phase 14)
- Tokens: crypto.randomBytes, hashed with SHA-256 before storage
- Email: nodemailer with SMTP, HTML templates with inline styles
- Forgot-password: always returns success to prevent user enumeration
- Profile update: current password required for email/password changes
- Email change: resets emailVerified to false, generates new verification token
- Last login: tracked via User.findByIdAndUpdate in NextAuth authorize

### SEO
- `generateMetadata` function in page components for dynamic metadata
- `generateExcerpt` strips HTML tags and truncates to 160 chars
- `generateCanonicalUrl` builds canonical URLs from base URL and path
- `generateOgImageUrl` handles both absolute and relative image URLs
- StructuredData component renders JSON-LD via dangerouslySetInnerHTML
- Sitemap fetches only active content via service layer

### Storage Provider
- Interface: IStorageProvider (upload, delete, getUrl, isConfigured)
- Factory: getStorageProvider() returns provider based on STORAGE_PROVIDER env
- Cloudinary: base64 upload, transformations (quality, auto format, responsive breakpoints)
- Placeholder credential detection prevents 500 errors
- Media model tracks storageType ('url' | 'upload') and publicId

### TipTap
- Extensions: Node.create() with addAttributes, parseHTML, renderHTML, addCommands, addNodeView
- NodeView via ReactNodeViewRenderer
- Carousel data stored: { carouselId, carouselType, title }
- Media data stored: { mediaId, url, filename, mimeType }
- ContentRenderer uses node-html-parser to parse HTML, NodeType.TEXT_NODE for text nodes

### Services
- Pattern: `await dbConnect()` then call Mongoose model methods
- Single default: findOneAndUpdate to set others to false
- Active filter: all public getters use `{ isActive: true }`

### Forms
- API route: POST/PUT to /api/<model>/<id>
- Use fetch() with try/catch
- Error state display in alert div

### Public Pages
- Server components fetch via Service layer directly
- ContentRenderer parses TipTap HTML, renders carousels via GenericCarousel, media via img/video/download link
- `not-prose` class on carousel containers

## Files to Remember

### Search & Discovery (Phase 12)
- src/services/search/search-types.ts
- src/services/search/mongodb-search-provider.ts
- src/services/search/search-provider.ts
- src/services/search-service.ts
- src/app/api/search/route.ts
- src/components/features/public/SearchBar.tsx
- src/components/features/public/SearchResults.tsx
- src/app/(public)/search/page.tsx
- src/__tests__/services/search-service.test.ts

### User Management (Phase 14)
- src/utils/tokens.ts
- src/utils/email.ts
- src/app/api/auth/verify-email/route.ts
- src/app/api/auth/forgot-password/route.ts
- src/app/api/auth/reset-password/route.ts
- src/app/api/auth/profile/route.ts
- src/app/(public)/verify-email/page.tsx
- src/app/(public)/forgot-password/page.tsx
- src/app/(public)/reset-password/page.tsx
- src/app/admin/(dashboard)/profile/page.tsx
- src/components/features/admin/ProfileForm.tsx

### SEO
- src/utils/seo.ts
- src/components/features/seo/StructuredData.tsx
- src/app/sitemap.ts
- src/app/robots.ts

### Storage
- src/services/storage/storage-types.ts
- src/services/storage/cloudinary-provider.ts
- src/services/storage/storage-provider.ts
- src/components/features/admin/FileUploader.tsx

### Editor
- src/components/editor/RichTextEditor.tsx
- src/components/editor/CarouselNodeView.tsx
- src/components/editor/MediaNodeView.tsx
- src/components/editor/extensions/carousel-extension.ts
- src/components/editor/extensions/media-extension.ts

### Content
- src/components/features/content/ContentRenderer.tsx

### Public Pages
- src/app/(public)/page.tsx (uses ContentRenderer, SEO metadata)
- src/app/(public)/[slug]/page.tsx (uses ContentRenderer, generateMetadata)
- src/app/(public)/blog/[slug]/page.tsx (uses ContentRenderer, generateMetadata)

### Admin Forms
- src/app/admin/(dashboard)/pages/_components/PageForm.tsx (uses RichTextEditor)
- src/app/admin/(dashboard)/blogs/_components/BlogForm.tsx (uses RichTextEditor)
- src/app/admin/(dashboard)/media/_components/MediaForm.tsx (URL/Upload modes)
- src/app/admin/(dashboard)/media/_components/MediaTable.tsx (URL copy modal)
- src/app/admin/(dashboard)/carousels/_components/CarouselForm.tsx (media library selector)

### Admin Layout
- src/app/admin/(dashboard)/page.tsx (redesigned dashboard)
- src/components/features/admin/AdminSidebar.tsx (Lucide icons, Profile link)
- src/components/features/admin/AdminHeader.tsx (enhanced header)

### Services
- src/services/page-service.ts
- src/services/blog-service.ts
- src/services/carousel-service.ts (getActiveCarouselItemsByType)
- src/services/navigation-service.ts
- src/services/user-service.ts (email verification, password reset, profile update)
- src/services/media-service.ts (uploadMedia, validation)
- src/services/contact-service.ts
- src/services/service-item-service.ts
- src/services/taxonomy-service.ts

### UI Components
- src/components/ui/GenericCarousel.tsx (CarouselItemData: {id, title?, imageOrIconUrl})
- src/components/ui/Input.tsx
- src/components/ui/Textarea.tsx
- src/components/ui/Select.tsx (options prop required)
- src/components/ui/Button.tsx
- src/components/ui/Card.tsx

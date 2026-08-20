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
**Phase 14: User Management - COMPLETED**

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
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - SMTP authentication username
- `SMTP_PASSWORD` - SMTP authentication password
- `EMAIL_FROM` - From address for outgoing emails

## Business Rules Implemented
1. **Single Default Rule:** ✅ Implemented in PageService and NavigationService
2. **Toggle State:** ✅ All services have `getActive*` methods that filter by `isActive: true`
3. **Auth Protection:** ✅ Admin routes and API endpoints protected
4. **Email Verification:** ✅ New users require email verification
5. **Password Reset:** ✅ Users can reset passwords via email link
6. **Profile Security:** ✅ Current password required for email/password changes

## Next Steps
- Phase 5.5: Playwright E2E testing (not yet done)
- Production deployment preparation
- Additional SEO features (dynamic OG images, breadcrumbs, FAQ schema)
- Rate limiting for auth endpoints (Phase 13.1)
- Audit logging for auth events (Phase 13.2)

## Important Notes
- All models use `{ timestamps: true }` for createdAt/updatedAt
- Models check `mongoose.models.X || mongoose.model()` to prevent re-compilation in dev
- Session strategy: JWT
- Test command: `npm test`
- Coverage command: `npm run test:coverage`
- Seed command: `npm run seed`
- Tokens are hashed (SHA-256) before database storage
- Forgot-password endpoint prevents user enumeration
# CMS Project Memory - State Snapshot

## Project Overview
Enterprise CMS built with Next.js 16.3.1 App Router, MongoDB/Mongoose, TypeScript.

## ⚠️ IMPORTANT: User Preferences
- **DO NOT commit or push** unless explicitly instructed by the user.

## Current State
Last commit: `6f676d8` - Phase 10: SEO & Discovery.

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

### Previous Fixes (not committed):
- Fixed circular reference in `src/app/(public)/page.tsx` - Mongoose subdocument `navMenu?.siteInfo` was being passed directly to `ContactSection` client component. Now explicitly extracts only serializable properties (address, phone, email).
- Fixed circular dependency in storage provider files - Extracted shared interfaces to `storage-types.ts`
- Fixed 500 error on media upload - Added placeholder Cloudinary credential detection
- Fixed Mongoose subdocument serialization error - Explicitly converts dimensions to plain objects
- Fixed TypeScript error in layout.tsx - Simplified googleBot robots config to basic index/follow

## Implementation Status

### Phase 1-6 Complete, Phase 5.5 (Playwright E2E) NOT done, Phase 7-10 Complete

### Key Features Implemented:
1. **SEO & Discovery** (Phase 10)
   - SEO utility functions in `src/utils/seo.ts`
   - StructuredData component for JSON-LD
   - Dynamic sitemap generation (`/sitemap.xml`)
   - Robots.txt configuration (`/robots.txt`)
   - Enhanced metadata across all public pages
   - OpenGraph, Twitter cards, canonical URLs

2. **Media Upload with Cloudinary** (Phase 9)
   - Storage provider abstraction (IStorageProvider interface)
   - Cloudinary integration with image optimization
   - File upload with drag-and-drop (FileUploader component)
   - Media library selector in carousel form
   - URL copy functionality in media management
   - Admin dashboard redesign with Lucide icons

3. **TipTap Rich Text Editor**
   - Extensions: carousel-extension.ts, media-extension.ts
   - NodeViews: CarouselNodeView.tsx (blue), MediaNodeView.tsx (green)
   - RichTextEditor.tsx - toolbar with bold/italic/strike/headings/lists/blockquote/link/image/undo/redo + Carousel/Media insert buttons
   - ContentRenderer.tsx - Server component rendering embedded carousels/media on public pages
   - Used in PageForm, BlogForm, page.tsx, [slug]/page.tsx, blog/[slug]/page.tsx

4. **Earlier Work:**
   - Admin pages for users, carousels, pages, blogs, navigation, media, categories, tags, service-items, contact-submissions
   - NextAuth.js authentication
   - Service layer with "single default" toggle logic
   - Contact form with CAPTCHA
   - Theme: light-only (#f9fafb background, #111827 foreground)

## Key Technical Patterns

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
- src/components/features/admin/AdminSidebar.tsx (Lucide icons)
- src/components/features/admin/AdminHeader.tsx (enhanced header)

### Services
- src/services/page-service.ts
- src/services/blog-service.ts
- src/services/carousel-service.ts (getActiveCarouselItemsByType)
- src/services/navigation-service.ts
- src/services/user-service.ts
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
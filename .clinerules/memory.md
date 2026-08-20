# CMS Project Memory - State Snapshot

## Project Overview
Enterprise CMS built with Next.js 16.3.1 App Router, MongoDB/Mongoose, TypeScript.

## ⚠️ IMPORTANT: User Preferences
- **DO NOT commit or push** unless explicitly instructed by the user.

## Current State
Last commit: `29ca19c` - Fix RangeError: Maximum call stack size exceeded on admin pages.

### Recent Fixes (not committed):
- Fixed circular reference in `src/app/(public)/page.tsx` - Mongoose subdocument `navMenu?.siteInfo` was being passed directly to `ContactSection` client component. Now explicitly extracts only serializable properties (address, phone, email).

## Implementation Status

### Phase 1-6 Complete, Phase 5.5 (Playwright E2E) NOT done

### Key Features Implemented:
1. **TipTap Rich Text Editor** (latest work)
   - Extensions: carousel-extension.ts, media-extension.ts
   - NodeViews: CarouselNodeView.tsx (blue), MediaNodeView.tsx (green)
   - RichTextEditor.tsx - toolbar with bold/italic/strike/headings/lists/blockquote/link/image/undo/redo + Carousel/Media insert buttons
   - ContentRenderer.tsx - Server component rendering embedded carousels/media on public pages
   - Used in PageForm, BlogForm, page.tsx, [slug]/page.tsx, blog/[slug]/page.tsx

2. **Earlier Work:**
   - Admin pages for users, carousels, pages, blogs, navigation, media, categories, tags, service-items, contact-submissions
   - NextAuth.js authentication
   - Service layer with "single default" toggle logic
   - Contact form with CAPTCHA
   - Theme: light-only (#f9fafb background, #111827 foreground)

## Key Technical Patterns

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

### Editor
- src/components/editor/RichTextEditor.tsx
- src/components/editor/CarouselNodeView.tsx
- src/components/editor/MediaNodeView.tsx
- src/components/editor/extensions/carousel-extension.ts
- src/components/editor/extensions/media-extension.ts

### Content
- src/components/features/content/ContentRenderer.tsx

### Public Pages
- src/app/(public)/page.tsx (uses ContentRenderer)
- src/app/(public)/[slug]/page.tsx (uses ContentRenderer)
- src/app/(public)/blog/[slug]/page.tsx (uses ContentRenderer)

### Admin Forms
- src/app/admin/(dashboard)/pages/_components/PageForm.tsx (uses RichTextEditor)
- src/app/admin/(dashboard)/blogs/_components/BlogForm.tsx (uses RichTextEditor)

### Services
- src/services/page-service.ts
- src/services/blog-service.ts
- src/services/carousel-service.ts (getActiveCarouselItemsByType)
- src/services/navigation-service.ts
- src/services/user-service.ts
- src/services/media-service.ts
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
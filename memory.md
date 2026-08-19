# CMS Project Memory

## Project Overview
Enterprise Full-Stack CMS built with Next.js App Router, MongoDB, and Mongoose.

## Current Status
**Phase 1: Foundation & Infrastructure - COMPLETED**
**Phase 2: Service Layer - COMPLETED**

## Tech Stack
- **Framework:** Next.js 16.3.1 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** NextAuth.js v4.24.15 (Credentials provider, JWT strategy)
- **Styling:** Tailwind CSS
- **Password Hashing:** bcryptjs
- **Testing:** Jest 30, ts-jest, ts-node

## Directory Structure
```
/src
  /app                    # View & Controller Routing Layer
    /api
      /auth
        /[...nextauth]    # NextAuth route handler
    layout.tsx
    page.tsx
  /models                 # Mongoose schemas (10 models)
  /services               # Business logic layer (9 services)
  /types                  # TypeScript type extensions
  /utils                  # Shared utilities (db-connect, auth)
  /components             # (empty - to be built in Phase 4/5)
  /hooks                  # (empty)
  /__tests__
    /services             # Jest unit tests (4 test files, 47 tests)
```

## Key Files Created

### Database Connection
- `src/utils/db-connect.ts` - MongoDB connection with caching for dev hot reloads

### Models (src/models/)
| File | Model | Key Fields |
|------|-------|------------|
| page-model.ts | Page | title, slug, content, isDefaultHomepage, isActive |
| blog-model.ts | Blog | title, slug, content, category(ref), tags(refs), featuredImage(ref), isActive |
| category-model.ts | Category | name, slug, isActive |
| tag-model.ts | Tag | name, slug, isActive |
| user-model.ts | User | name, email, passwordHash, role(Admin/Editor), isActive |
| navigation-menu-model.ts | NavigationMenu | title, isDefault, links[], siteInfo{address,phone,email}, isActive |
| media-model.ts | Media | filename, url, mimeType, size, isActive |
| carousel-item-model.ts | CarouselItem | title, imageOrIconUrl, type(hero/client/employee/recommendation), order, isActive |
| service-item-model.ts | ServiceItem | title, description, icon, isActive |
| contact-submission-model.ts | ContactSubmission | name, email, message, isRead, captchaScore |
| index.ts | Barrel export for all models |

### Services (src/services/)
| File | Service | Key Features |
|------|---------|--------------|
| page-service.ts | PageService | CRUD, **Single Default logic**, toggleActiveStatus, getDefaultHomepage |
| navigation-service.ts | NavigationService | CRUD, **Single Default logic**, toggleActiveStatus, getDefaultNavigationMenu |
| blog-service.ts | BlogService | CRUD with Category/Tag/Media relations (populate), getBlogsByCategory/Tag |
| taxonomy-service.ts | CategoryService, TagService | CRUD for both taxonomies, slug lowercasing |
| user-service.ts | UserService | CRUD with bcrypt password hashing, verifyCredentials, sanitizeUser |
| media-service.ts | MediaService | CRUD, getMediaByMimeType |
| carousel-service.ts | CarouselService | CRUD, getActiveCarouselItemsByType, reorderCarouselItems (bulkWrite) |
| service-item-service.ts | ServiceItemService | CRUD, getActiveServiceItems |
| contact-service.ts | ContactService | createSubmission, markAsRead/Unread, getUnreadSubmissions |
| index.ts | Barrel export for all services |

### Authentication
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth config with Credentials provider
- `src/types/next-auth.d.ts` - Extended Session/JWT with id and role
- `src/utils/auth.ts` - Helpers: getSession(), requireAuth(), isAdmin(), requireAdmin()

### Testing
- `jest.config.ts` - Jest configuration with ts-jest preset, path aliases
- `src/__tests__/services/page-service.test.ts` - 15 tests including Single Default logic
- `src/__tests__/services/navigation-service.test.ts` - 11 tests including Single Default logic
- `src/__tests__/services/blog-service.test.ts` - 10 tests with relations
- `src/__tests__/services/user-service.test.ts` - 11 tests with password hashing
- **All 47 tests passing**

### Environment
- `.env.local` - MONGODB_URI, NEXTAUTH_URL, NEXTAUTH_SECRET

## Business Rules Implemented
1. **Single Default Rule:** ✅ Implemented in PageService and NavigationService
   - When creating/updating with `isDefaultHomepage: true` or `isDefault: true`, all other records are unset via `updateMany`
2. **Toggle State:** ✅ All services have `getActive*` methods that filter by `isActive: true`
3. **Auth Protection:** Ready (helpers in place, to be used in Phase 3/4)

## Next Steps (Phase 3: API Controllers)
- [ ] Create CRUD API routes for Pages (`/api/pages`), Blogs (`/api/blogs`), etc.
- [ ] Add Zod validation schemas for POST/PUT payloads
- [ ] Create `POST /api/contact` with server-side CAPTCHA verification
- [ ] Protect admin API endpoints with auth helpers

## Important Notes
- All models use `{ timestamps: true }` for createdAt/updatedAt
- Models check `mongoose.models.X || mongoose.model()` to prevent re-compilation in dev
- NextAuth sign-in page configured at `/admin/login` (to be created in Phase 4)
- Session strategy: JWT
- CAPTCHA integration planned for Phase 3 (contact form)
- Test command: `npm test` (47 tests)
- Coverage command: `npm run test:coverage`
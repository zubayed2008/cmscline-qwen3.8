# CMS Project Memory

## Project Overview
Enterprise Full-Stack CMS built with Next.js App Router, MongoDB, and Mongoose.

## Current Status
**Phase 1: Foundation & Infrastructure - COMPLETED**

## Tech Stack
- **Framework:** Next.js 16.3.1 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** NextAuth.js v4.24.15 (Credentials provider, JWT strategy)
- **Styling:** Tailwind CSS
- **Password Hashing:** bcryptjs

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
  /types                  # TypeScript type extensions
  /utils                  # Shared utilities (db-connect, auth)
  /components             # (empty - to be built in Phase 4/5)
  /services               # (empty - to be built in Phase 2)
  /hooks                  # (empty)
  /__tests__              # (empty - to be built in Phase 2)
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

### Authentication
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth config with Credentials provider
- `src/types/next-auth.d.ts` - Extended Session/JWT with id and role
- `src/utils/auth.ts` - Helpers: getSession(), requireAuth(), isAdmin(), requireAdmin()

### Environment
- `.env.local` - MONGODB_URI, NEXTAUTH_URL, NEXTAUTH_SECRET

## Business Rules to Implement (Phase 2)
1. **Single Default Rule:** Only one Page can have `isDefaultHomepage: true`; only one NavigationMenu can have `isDefault: true`. When setting true, must unset all others.
2. **Toggle State:** Public views must only fetch `isActive: true` records.
3. **Auth Protection:** Admin routes/APIs must be protected.

## Next Steps (Phase 2)
- [ ] Create `/services/page-service.ts` with Single Default logic
- [ ] Create `/services/navigation-service.ts` with Single Default logic
- [ ] Create `/services/blog-service.ts` with Category/Tag relations
- [ ] Create services for Users, Media, Carousels, Tags, Categories, Service Items
- [ ] Write Jest unit tests in `/__tests__/services/`

## Important Notes
- All models use `{ timestamps: true }` for createdAt/updatedAt
- Models check `mongoose.models.X || mongoose.model()` to prevent re-compilation in dev
- NextAuth sign-in page configured at `/admin/login` (to be created in Phase 4)
- Session strategy: JWT
- CAPTCHA integration planned for Phase 3 (contact form)
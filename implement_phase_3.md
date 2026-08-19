# Phase 3 Implementation: API Controllers

## Overview
Phase 3 implements the API Controller layer using Next.js Route Handlers. All routes are "thin" controllers that parse HTTP requests, validate payloads with Zod, and delegate to the Service layer.

## Implementation Date
2026-08-19

---

## Files Created

### Validation Schemas
| File | Description |
|------|-------------|
| `src/types/schemas.ts` | Zod validation schemas for all entities (Page, Blog, Category, Tag, User, NavigationMenu, Media, CarouselItem, ServiceItem, ContactSubmission) |

### Utilities
| File | Description |
|------|-------------|
| `src/utils/api-response.ts` | Standardized API response helpers (`successResponse`, `errorResponse`, `handleValidationError`, `handleError`) |
| `src/utils/captcha.ts` | Google reCAPTCHA v3 server-side verification utility |

### API Routes

#### Pages
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/pages` | GET, POST | GET: Public (`?active=true`) or Auth; POST: Auth | List pages, create page |
| `/api/pages/[id]` | GET, PUT, DELETE | Auth | Get, update, delete page by ID |

#### Blogs
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/blogs` | GET, POST | GET: Public (`?active=true`) or Auth; POST: Auth | List blogs with category/tag filtering |
| `/api/blogs/[id]` | GET, PUT, DELETE | Auth | Get, update, delete blog by ID |

#### Categories
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/categories` | GET, POST | GET: Public (`?active=true`) or Auth; POST: Auth | List categories, create category |
| `/api/categories/[id]` | GET, PUT, DELETE | Auth | Get, update, delete category by ID |

#### Tags
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/tags` | GET, POST | GET: Public (`?active=true`) or Auth; POST: Auth | List tags, create tag |
| `/api/tags/[id]` | GET, PUT, DELETE | Auth | Get, update, delete tag by ID |

#### Users
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/users` | GET, POST | Admin | List users (sanitized), create user |
| `/api/users/[id]` | GET, PUT, DELETE | Admin | Get, update, delete user by ID |

#### Navigation Menus
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/navigation-menus` | GET, POST | GET: Public (`?active=true` or `?default=true`) or Auth; POST: Auth | List menus, get default menu, create menu |
| `/api/navigation-menus/[id]` | GET, PUT, DELETE | Auth | Get, update, delete menu by ID |

#### Media
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/media` | GET, POST | GET: Public (`?active=true`) or Auth; POST: Auth | List media with MIME type filtering |
| `/api/media/[id]` | GET, PUT, DELETE | Auth | Get, update, delete media by ID |

#### Carousels
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/carousels` | GET, POST, PUT | GET: Public (`?active=true`) or Auth; POST/PUT: Auth | List carousel items by type, create item, reorder items |
| `/api/carousels/[id]` | GET, PUT, DELETE | Auth | Get, update, delete carousel item by ID |

#### Service Items
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/service-items` | GET, POST | GET: Public (`?active=true`) or Auth; POST: Auth | List service items, create item |
| `/api/service-items/[id]` | GET, PUT, DELETE | Auth | Get, update, delete service item by ID |

#### Contact
| Route | Methods | Auth | Description |
|-------|---------|------|-------------|
| `/api/contact` | GET, POST | GET: Auth; POST: Public (with CAPTCHA) | List submissions, submit contact form |
| `/api/contact/[id]` | GET, PUT, DELETE | Auth | Get, toggle read status, delete submission |

---

## Key Features

### 1. Zod Validation
All POST and PUT routes validate incoming payloads using Zod schemas before passing data to services:
- String length constraints
- Email format validation
- Slug format validation (lowercase alphanumeric with hyphens)
- ObjectId format validation for references
- Enum validation for roles and carousel types

### 2. Standardized Error Responses
All errors follow the format:
```json
{
  "success": false,
  "error": "Meaningful error message",
  "code": 400,
  "details": [] // Optional validation details
}
```

Error codes:
- `400` - Validation failed / Bad request
- `401` - Unauthorized
- `403` - Forbidden (Admin access required)
- `404` - Resource not found
- `409` - Duplicate key error
- `500` - Internal server error

### 3. Authentication & Authorization
- `requireAuth()` - Requires any authenticated user
- `requireAdmin()` - Requires Admin role (used for User management)
- Public endpoints use `?active=true` query parameter

### 4. CAPTCHA Verification
The `/api/contact` POST endpoint:
1. Validates the request body with Zod
2. Verifies the reCAPTCHA v3 token server-side
3. Checks score threshold (0.5 minimum)
4. Only saves submission if CAPTCHA passes
5. Stores the CAPTCHA score with the submission

Environment variables:
- `RECAPTCHA_SECRET_KEY` - Google reCAPTCHA secret key
- `RECAPTCHA_SITE_KEY` - Google reCAPTCHA site key (for frontend)

If `RECAPTCHA_SECRET_KEY` is not configured, CAPTCHA verification is skipped (development mode).

### 5. Query Parameters

| Endpoint | Parameter | Description |
|----------|-----------|-------------|
| `/api/pages` | `?active=true` | Return only active pages (public) |
| `/api/blogs` | `?active=true` | Return only active blogs (public) |
| `/api/blogs` | `?category=slug` | Filter by category slug |
| `/api/blogs` | `?tag=slug` | Filter by tag slug |
| `/api/categories` | `?active=true` | Return only active categories (public) |
| `/api/tags` | `?active=true` | Return only active tags (public) |
| `/api/navigation-menus` | `?active=true` | Return only active menus (public) |
| `/api/navigation-menus` | `?default=true` | Return default menu (public) |
| `/api/media` | `?active=true` | Return only active media (public) |
| `/api/media` | `?mimeType=image` | Filter by MIME type prefix |
| `/api/carousels` | `?active=true` | Return only active items (public) |
| `/api/carousels` | `?type=hero` | Filter by carousel type |
| `/api/service-items` | `?active=true` | Return only active items (public) |
| `/api/contact` | `?unread=true` | Return only unread submissions |

---

## Dependencies Added
- `zod@^4.4.3` - Schema validation

---

## Verification
- TypeScript compilation: ✅ Passed (`npx tsc --noEmit`)
- ESLint: ✅ Passed (0 errors, 17 warnings from existing test files)
- Unit tests: ✅ 139/139 passed

---

## Next Steps (Phase 4)
- Create `/app/admin/layout.tsx` with sidebar navigation
- Build Data Table UI component with Active/Deactivate toggle
- Build Create/Edit forms for Pages and Blogs
- Build Navigation Menu builder UI
# Phase 2 Implementation: The Service Layer (Business Logic)

**Status:** ✅ COMPLETED  
**Date:** 2026-08-19

---

## Overview
This document describes the implementation of Phase 2 of the Enterprise CMS project, which builds the core engine that interacts with MongoDB, ensuring business constraints are respected.

---

## Step 2.1: Page & Navigation Services (Single Default Logic)

### File: `src/services/page-service.ts`

**Purpose:** CRUD operations for Pages with the critical "Single Default" rule.

**Key Implementation Details:**
- **Single Default Rule:** When creating or updating a Page with `isDefaultHomepage: true`, all other Pages are automatically set to `isDefaultHomepage: false` via `updateMany`
- Slug normalization: Automatically lowercased on create/update
- Public queries filter by `isActive: true`

**Methods:**

| Method | Description |
|--------|-------------|
| `createPage(data)` | Create page; if `isDefaultHomepage: true`, unset all others first |
| `getPageById(id)` | Get single page by ID |
| `getPageBySlug(slug)` | Get page by slug |
| `getPages(filter?)` | Get all pages with optional filter |
| `getActivePages()` | Get only `isActive: true` pages (public) |
| `getDefaultHomepage()` | Get the page where `isDefaultHomepage: true` |
| `updatePage(id, data)` | Update page; handles Single Default toggle |
| `toggleActiveStatus(id)` | Toggle `isActive` boolean |
| `deletePage(id)` | Delete page by ID |

**Single Default Logic:**
```typescript
if (data.isDefaultHomepage === true) {
  await Page.updateMany(
    { _id: { $ne: id } },
    { $set: { isDefaultHomepage: false } }
  );
}
```

### File: `src/services/navigation-service.ts`

**Purpose:** CRUD operations for Navigation Menus with the "Single Default" rule.

**Methods:**

| Method | Description |
|--------|-------------|
| `createMenu(data)` | Create menu; if `isDefault: true`, unset all others first |
| `getMenuById(id)` | Get single menu by ID |
| `getMenus()` | Get all menus |
| `getActiveMenus()` | Get only `isActive: true` menus |
| `getDefaultMenu()` | Get the menu where `isDefault: true` |
| `updateMenu(id, data)` | Update menu; handles Single Default toggle |
| `toggleActiveStatus(id)` | Toggle `isActive` boolean |
| `deleteMenu(id)` | Delete menu by ID |

---

## Step 2.2: Blog Service (Relations)

### File: `src/services/blog-service.ts`

**Purpose:** CRUD operations for Blogs with Category, Tag, and Media relations.

**Key Implementation Details:**
- Converts string IDs to `ObjectId` for category, tags, and featuredImage
- Uses `populate()` to resolve relations in queries
- Slug normalization: Automatically lowercased on create/update

**Methods:**

| Method | Description |
|--------|-------------|
| `createBlog(data)` | Create blog with ObjectId conversion |
| `getBlogById(id)` | Get blog with populated relations |
| `getBlogBySlug(slug)` | Get blog by slug with populated relations |
| `getBlogs(filter?)` | Get all blogs with populated relations |
| `getActiveBlogs()` | Get only `isActive: true` blogs (public) |
| `getBlogsByCategory(categoryId)` | Filter blogs by category |
| `getBlogsByTag(tagId)` | Filter blogs by tag |
| `updateBlog(id, data)` | Update blog with ObjectId conversion |
| `toggleActiveStatus(id)` | Toggle `isActive` boolean |
| `deleteBlog(id)` | Delete blog by ID |

**Populate Pattern:**
```typescript
.populate('category', 'name slug')
.populate('tags', 'name slug')
.populate('featuredImage', 'filename url')
```

---

## Step 2.3: Remaining Services

### File: `src/services/taxonomy-service.ts`

**Purpose:** CRUD operations for Categories and Tags (identical structure, separate collections).

**Exports:** `CategoryService` and `TagService` classes

**Methods (both services):**

| Method | Description |
|--------|-------------|
| `create(data)` | Create with slug lowercasing |
| `getById(id)` | Get by ID |
| `getBySlug(slug)` | Get by slug |
| `getAll(filter?)` | Get all with optional filter |
| `getActive()` | Get only `isActive: true` |
| `update(id, data)` | Update with slug lowercasing |
| `toggleActiveStatus(id)` | Toggle `isActive` boolean |
| `delete(id)` | Delete by ID |

### File: `src/services/user-service.ts`

**Purpose:** User management with password hashing.

**Key Implementation Details:**
- Passwords hashed with `bcryptjs` (salt rounds: 10)
- Email normalized to lowercase
- `verifyCredentials()` for authentication flow

**Methods:**

| Method | Description |
|--------|-------------|
| `createUser(data)` | Create user with hashed password |
| `getUserById(id)` | Get user (excludes passwordHash) |
| `getUserByEmail(email)` | Get user by email |
| `getUsers()` | Get all users |
| `updateUser(id, data)` | Update user; re-hash if password provided |
| `toggleActiveStatus(id)` | Toggle `isActive` boolean |
| `deleteUser(id)` | Delete user by ID |
| `verifyCredentials(email, password)` | Verify login credentials |

### File: `src/services/media-service.ts`

**Purpose:** Media library management.

**Methods:**

| Method | Description |
|--------|-------------|
| `createMedia(data)` | Create media record |
| `getMediaById(id)` | Get by ID |
| `getAllMedia(filter?)` | Get all with optional filter |
| `getActiveMedia()` | Get only `isActive: true` |
| `getMediaByMimeType(mimeType)` | Filter by MIME type |
| `updateMedia(id, data)` | Update media record |
| `toggleActiveStatus(id)` | Toggle `isActive` boolean |
| `deleteMedia(id)` | Delete media by ID |

### File: `src/services/carousel-service.ts`

**Purpose:** Carousel item management with type filtering and reordering.

**Key Implementation Details:**
- Type enum: `'hero' | 'client' | 'employee' | 'recommendation'`
- `reorderCarousels()` uses `bulkWrite` for efficient batch updates

**Methods:**

| Method | Description |
|--------|-------------|
| `createCarousel(data)` | Create carousel item |
| `getCarouselById(id)` | Get by ID |
| `getAllCarousels(filter?)` | Get all with optional filter |
| `getActiveCarousels()` | Get only `isActive: true` |
| `getCarouselsByType(type)` | Filter by carousel type |
| `updateCarousel(id, data)` | Update carousel item |
| `toggleActiveStatus(id)` | Toggle `isActive` boolean |
| `deleteCarousel(id)` | Delete carousel item |
| `reorderCarousels(orders)` | Batch update order via bulkWrite |

**Reorder Pattern:**
```typescript
const operations = orders.map(({ id, order }) => ({
  updateOne: {
    filter: { _id: id },
    update: { $set: { order } }
  }
}));
await CarouselItem.bulkWrite(operations);
```

### File: `src/services/service-item-service.ts`

**Purpose:** Service item management for homepage service grid.

**Methods:**

| Method | Description |
|--------|-------------|
| `createServiceItem(data)` | Create service item |
| `getServiceItemById(id)` | Get by ID |
| `getAllServiceItems(filter?)` | Get all with optional filter |
| `getActiveServiceItems()` | Get only `isActive: true` |
| `updateServiceItem(id, data)` | Update service item |
| `toggleActiveStatus(id)` | Toggle `isActive` boolean |
| `deleteServiceItem(id)` | Delete service item |

### File: `src/services/contact-service.ts`

**Purpose:** Contact form submission management.

**Methods:**

| Method | Description |
|--------|-------------|
| `createSubmission(data)` | Create contact submission |
| `getSubmissionById(id)` | Get by ID |
| `getAllSubmissions(filter?)` | Get all with optional filter |
| `getUnreadSubmissions()` | Get submissions where `isRead: false` |
| `markAsRead(id)` | Set `isRead: true` |
| `markAsUnread(id)` | Set `isRead: false` |
| `toggleReadStatus(id)` | Toggle `isRead` boolean |
| `deleteSubmission(id)` | Delete submission by ID |

---

## Step 2.4: Jest Unit Tests

### Test Configuration

**File: `jest.config.ts`**
```typescript
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

**Dependencies Installed:**
```bash
npm install -D jest ts-jest ts-node @types/jest
```

### Test Files Created in `src/__tests__/services/`

| File | Tests | Key Coverage |
|------|-------|--------------|
| `page-service.test.ts` | Single Default logic, CRUD, toggle | Verifies `updateMany` called when `isDefaultHomepage: true` |
| `navigation-service.test.ts` | Single Default logic, CRUD, toggle | Verifies `updateMany` called when `isDefault: true` |
| `blog-service.test.ts` | ObjectId conversion, populate, CRUD | Verifies relations populated correctly |
| `user-service.test.ts` | Password hashing, verifyCredentials | Verifies bcrypt called with correct salt rounds |
| `taxonomy-service.test.ts` | CategoryService + TagService | Verifies slug lowercasing, both services |
| `media-service.test.ts` | CRUD, MIME type filtering | Verifies active filtering |
| `carousel-service.test.ts` | CRUD, type filtering, bulkWrite reorder | Verifies bulkWrite operations |
| `service-item-service.test.ts` | CRUD, active filtering | Verifies toggle behavior |
| `contact-service.test.ts` | Submissions, read/unread toggle | Verifies isRead state changes |

### Test Results

```
Test Suites: 9 passed, 9 total
Tests:       139 passed, 139 total
Snapshots:   0 total
Time:        ~8s
```

### Mocking Pattern

All tests follow this pattern:
```typescript
jest.mock('@/utils/db-connect', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('@/models/page-model', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    updateMany: jest.fn(),
    // ...
  }
}));
```

---

## Files Created (Complete List)

```
src/services/page-service.ts
src/services/navigation-service.ts
src/services/blog-service.ts
src/services/taxonomy-service.ts
src/services/user-service.ts
src/services/media-service.ts
src/services/carousel-service.ts
src/services/service-item-service.ts
src/services/contact-service.ts
jest.config.ts
src/__tests__/services/page-service.test.ts
src/__tests__/services/navigation-service.test.ts
src/__tests__/services/blog-service.test.ts
src/__tests__/services/user-service.test.ts
src/__tests__/services/taxonomy-service.test.ts
src/__tests__/services/media-service.test.ts
src/__tests__/services/carousel-service.test.ts
src/__tests__/services/service-item-service.test.ts
src/__tests__/services/contact-service.test.ts
```

---

## Business Rules Enforced

| Rule | Implementation |
|------|----------------|
| **Single Default (Pages)** | `updateMany({ _id: { $ne: id } }, { $set: { isDefaultHomepage: false } })` before setting new default |
| **Single Default (Menus)** | `updateMany({ _id: { $ne: id } }, { $set: { isDefault: false } })` before setting new default |
| **Toggle State** | All services have `toggleActiveStatus()` method |
| **Public Filtering** | All `getActive*()` methods filter by `isActive: true` |
| **Slug Normalization** | Slugs lowercased on create/update |
| **Email Normalization** | Emails lowercased on create/update |
| **Password Security** | bcrypt hashing with 10 salt rounds |

---

## Next Phase: Phase 3 - API Controllers

The following API routes need to be implemented:
1. `/api/pages` - CRUD with Zod validation
2. `/api/blogs` - CRUD with Zod validation
3. `/api/categories`, `/api/tags` - Taxonomy CRUD
4. `/api/users`, `/api/media`, `/api/carousels`, `/api/service-items` - Admin CRUD
5. `/api/navigation` - Navigation menu CRUD
6. `/api/contact` - Public submission with CAPTCHA verification
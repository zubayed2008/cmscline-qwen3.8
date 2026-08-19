# Project Specification: Enterprise Full-Stack CMS

## 1. Overview
A comprehensive Content Management System (CMS) built on Next.js App Router and MongoDB. The system features dynamic page building, blog management, media handling, and robust user/settings administration. It includes reusable frontend components and CAPTCHA-protected forms.

## 2. Data Models (Mongoose Schemas)

The following TypeScript schemas must be used for the `/models` directory. All models inherently support `createdAt` and `updatedAt` via Mongoose's `{ timestamps: true }` option.

### Core Content Models

```typescript
// Page Model
const pageSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  content: { type: String, required: true }, // Markdown or HTML
  isDefaultHomepage: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Blog Model
const blogSchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  content: { type: String, required: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
  featuredImage: { type: Schema.Types.ObjectId, ref: 'Media' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Category & Tag Models (Identical structure, separate collections)
const taxonomySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// User Model
const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Editor'], default: 'Editor' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Navigation Menu Model
const navigationMenuSchema = new Schema({
  title: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  links: [{ label: String, url: String }],
  siteInfo: {
    address: { type: String },
    phone: { type: String },
    email: { type: String }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Media Library Model
const mediaSchema = new Schema({
  filename: { type: String, required: true },
  url: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Carousel Item Model (For Hero, Clients, Employees, Recommendations)
const carouselItemSchema = new Schema({
  title: { type: String },
  imageOrIconUrl: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['hero', 'client', 'employee', 'recommendation'], 
    required: true 
  },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Service Item Model
const serviceItemSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String }, // URL or icon class
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Contact Submission Model
const contactSubmissionSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  captchaScore: { type: Number }
}, { timestamps: true });

```

### Core Content
- **Page:** `title`, `slug`, `content` (Markdown/HTML), `isDefaultHomepage` (Boolean).
- **Blog:** `title`, `slug`, `content`, `category` (ObjectId ref), `tags` (Array of ObjectId refs), `featuredImage` (ObjectId ref).
- **Category / Tag:** `name`, `slug`.

### System & Settings
- **User:** `name`, `email`, `passwordHash`, `role` (Admin/Editor).
- **NavigationMenu:** `title`, `isDefault` (Boolean), `links` (Array of `{ label, url }`), `siteInfo` (Embedded object: `address`, `phone`, `email`).
- **Media (Library):** `filename`, `url`, `mimeType`, `size`.
- **CarouselItem:** `title`, `imageOrIconUrl`, `type` (Enum: `'hero'`, `'client'`, `'employee'`, `'recommendation'`), `order` (Number).
- **ServiceItem:** `title`, `description`, `icon`.

### Interaction
- **ContactSubmission:** `name`, `email`, `message`, `isRead` (Boolean), `captchaScore` (Number).

## 3. Business Logic & Constraints (Service Layer)

The `/services` layer must enforce the following critical business rules:
- **The "Single Default" Rule:** 
  - The system supports multiple Pages, but only one can act as the landing page. When a Page is created or updated with `isDefaultHomepage: true`, the service must automatically query and set `isDefaultHomepage: false` on all other Pages.
  - The same logic applies to `NavigationMenu` using the `isDefault` property.
- **Toggle State:** Admins can toggle the `isActive` state on any record. The frontend Public Views must only fetch records where `isActive: true`.
- **Authentication:** Admin routes and API endpoints must be protected (e.g., via JWT or NextAuth).

## 4. Frontend Public Views & Modular Components

The public-facing site (`/src/app`) uses server-side data fetching to render the active default configurations. 

### Page Routing
- **`GET /` (Homepage):** Automatically resolves to the Page where `isDefaultHomepage: true`. It constructs the view using the generic UI components below.
- **`GET /blog` & `GET /blog/[slug]`:** Dynamically lists and displays active blogs.
- **`GET /[slug]`:** Resolves dynamic custom pages (e.g., About Us, Privacy Policy).

### Generic & Modular UI Components (`/src/components/ui`)
- **`GenericCarousel` (Client Component):** A highly reusable slider (using Owl Carousel, Swiper, or React Slick). 
  - **Props:** `title` (Header text), `type` (e.g., 'clients', 'hero'), `items` (Array of images/icons).
  - **Usage:** Renders the 3-image Hero banner, the "Company We Work With" icon scroller, and Employee/Recommendation sections.
- **`MapLocation` (Client Component):** An isolated component that renders a map (e.g., via Leaflet or Google Maps iframe) based on the address stored in the default NavigationMenu.
- **`ServiceGrid` (Server Component):** Fetches and displays active `ServiceItem` records.
- **`ContactSection` (Client Component):** A separated module containing the contact form. 
  - **Security Requirement:** Must implement a CAPTCHA provider (e.g., Google reCAPTCHA v3 or Cloudflare Turnstile) before the form can be submitted to prevent email/spam attacks.

## 5. Admin Portal Views

The `/src/app/admin` directory contains Client/Server components for CMS management:
- **Auth:** `/admin/login`.
- **Content Management:** `/admin/pages`, `/admin/blogs`, `/admin/categories`, `/admin/tags`. Includes lists with "Active/Deactivate" toggle switches.
- **Media & Users:** `/admin/media` (Grid view of uploads) and `/admin/users`.
- **System Settings:** 
  - `/admin/navigation`: Builder for header/footer links, address, and phone numbers. Enforces the single-default toggle.
  - `/admin/carousels`: Upload images and assign them to generic carousels (Hero, Clients).
- **Inbox:** `/admin/contact-submissions` to view form entries.

## 6. AI IDE (Kiro) Execution Instructions
When utilizing Kiro IDE, explicitly command the generation in this specific order to respect dependencies:

- 1. **Setup & DB:** Generate `/utils/db-connect.ts` and NextAuth/JWT authentication utilities.
- 2. **Data Layer:** Generate all Mongoose models in `/models/*` according to Section 2.
- 3. **Core Services:** Generate `/services/page-service.ts` and `/services/navigation-service.ts` **first**, ensuring the  "Single Default" logic is explicitly implemented in the update/create functions.
- 4. **Remaining Services:** Generate services for Blogs, Media, Contact, Users, and Carousels.
- 5. **API Controllers:** Generate all `/app/api/*` Next.js route handlers. Ensure `POST /api/contact` includes server-side CAPTCHA token validation before saving.
- 6. **UI Components:** Generate `GenericCarousel.tsx`, `MapLocation.tsx`, and `ContactSection.tsx` in `/src/components/features/`.
- 7. **Frontend Views:** Generate the dynamic `app/page.tsx` and the `app/admin/*` dashboards.
- 8 **Generate** a /scripts/seed.ts file that, when executed, clears the database and inserts one default Admin user and one default Homepage.
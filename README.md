# Enterprise CMS

A comprehensive Content Management System (CMS) built with Next.js App Router, MongoDB, and Mongoose. Features dynamic page building, blog management, media handling, and robust user/settings administration.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 (App Router) | Full-stack React framework |
| TypeScript | Type-safe development |
| MongoDB + Mongoose | Database and ODM |
| NextAuth.js v4 | Authentication (Credentials + JWT) |
| Tailwind CSS | Styling |
| bcryptjs | Password hashing |
| Umami | Self-hosted analytics (Phase 7) |

## Project Structure

```
/src
  /app                    # Routing layer (pages + API routes)
    /api
      /auth/[...nextauth] # NextAuth endpoint
  /models                 # Mongoose schemas
  /types                  # TypeScript type definitions
  /utils                  # Shared utilities
  /components             # React components (Phase 4/5)
  /services               # Business logic layer (Phase 2)
  /hooks                  # Custom React hooks
  /__tests__              # Unit tests
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally or a MongoDB Atlas connection string

### Installation

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.local.example .env.local  # or edit .env.local directly
```

### Environment Variables

Create/edit `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/cms
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secure-random-secret-here

# Umami Analytics (optional - only if self-hosting)
# NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id
# NEXT_PUBLIC_UMAMI_SCRIPT_URL=http://localhost:3001/script.js

# Umami API (for admin dashboard analytics display)
# UMAMI_API_URL=http://127.0.0.1:3001
# UMAMI_USERNAME=admin
# UMAMI_PASSWORD=umami
```

> ⚠️ **Important:** Replace `NEXTAUTH_SECRET` with a secure random string.

### Umami Analytics Setup (Optional)

Umami is a privacy-focused, self-hosted analytics platform. To run it locally:

```bash
# Start Umami with Docker Compose
docker compose -f docker-compose.umami.yml up -d
```

This starts:
- **Umami** at [http://127.0.0.1:3001](http://127.0.0.1:3001)
- **PostgreSQL** database for Umami

> 💡 **Windows Tip:** Use `127.0.0.1:3001` instead of `localhost:3001` as Docker Desktop may not forward IPv6 correctly.

**Default credentials:**
- Username: `admin`
- Password: `umami`

> ⚠️ **Important:** Change the default credentials in `docker-compose.umami.yml` before production use.

**After starting Umami:**
1. Log in to [http://127.0.0.1:3001](http://127.0.0.1:3001)
2. Add a new website and get the Website ID
3. Update `.env.local` with:
   ```env
   NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id
   NEXT_PUBLIC_UMAMI_SCRIPT_URL=http://localhost:3001/script.js
   UMAMI_API_URL=http://127.0.0.1:3001
   UMAMI_USERNAME=admin
   UMAMI_PASSWORD=umami
   ```

**Admin Dashboard Analytics:**

Once Umami is configured, navigate to `/admin/analytics` in the CMS admin panel to view:
- Active visitors
- Pageviews, unique visitors
- Bounce rate, average session duration
- 30-day pageviews chart

The analytics dashboard fetches data from the Umami API and displays it natively within the CMS.

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Data Models

| Model | Description |
|-------|-------------|
| Page | CMS pages with default homepage flag |
| Blog | Blog posts with category, tags, featured image |
| Category / Tag | Taxonomy for blog organization |
| User | Admin/Editor users with hashed passwords |
| NavigationMenu | Site navigation links and site info |
| Media | Uploaded media library |
| CarouselItem | Hero/client/employee/recommendation carousels |
| ServiceItem | Service offerings display |
| ContactSubmission | Contact form entries |

## Authentication

- **Sign-in endpoint:** `/api/auth/[...nextauth]`
- **Sign-in page:** `/admin/login` (Phase 4)
- **Session strategy:** JWT
- **Roles:** `Admin`, `Editor`

### Auth Helpers

```typescript
import { getSession, requireAuth, requireAdmin } from '@/utils/auth';

// Get session (returns null if not authenticated)
const session = await getSession();

// Require authentication (throws if not logged in)
const session = await requireAuth();

// Require admin role (throws if not admin)
const session = await requireAdmin();
```

## Development Status

- ✅ **Phase 1:** Foundation & Infrastructure (Models, DB connection, Auth)
- ✅ **Phase 2:** Service Layer (Business logic)
- ✅ **Phase 3:** API Controllers
- ✅ **Phase 4:** Admin Portal
- ✅ **Phase 5:** Public Frontend
- ✅ **Phase 6:** Polish & Seeding
- ✅ **Phase 7:** Self-Hosted Analytics (Umami)

See `implement_phase_1.md` for detailed implementation notes.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## License

Private - All rights reserved.
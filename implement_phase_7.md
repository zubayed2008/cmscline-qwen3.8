# Phase 7 Implementation: Self-Hosted Analytics & Monitoring (Umami)

**Status:** ✅ COMPLETED  
**Date:** 2026-08-20

---

## Overview
This document describes the implementation of Phase 7, which integrates a privacy-focused, self-hosted Umami Analytics instance into the Enterprise CMS. Umami tracks pageviews locally without relying on third-party cookies.

---

## Step 7.1: Umami Docker Setup

### File: `docker-compose.umami.yml`

**Purpose:** Docker Compose configuration for running a local Umami instance with PostgreSQL database.

**Services:**

| Service | Image | Port Mapping | Purpose |
|---------|-------|--------------|---------|
| `umami-analytics` | `ghcr.io/umami-software/umami:latest` | `3001:3000` | Umami web application |
| `umami-database` | `postgres:15-alpine` | `5432` (internal) | PostgreSQL database |

**Environment Variables (Docker):**

| Variable | Value | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | `postgresql://umami:umami@umami-db:5432/umami` | Database connection |
| `ADMIN_USER` | `admin` | Default admin username |
| `ADMIN_PASSWORD` | `umami-admin-123` | Default admin password |
| `APP_SECRET` | `change-this-to-a-random-secret-string` | Session encryption key |

**Volumes:**
- `umami-db-data` - Persistent PostgreSQL data

**Network:**
- `umami-network` (bridge driver)

**Usage:**
```bash
# Start Umami
docker compose -f docker-compose.umami.yml up -d

# Stop Umami
docker compose -f docker-compose.umami.yml down

# View logs
docker logs umami-analytics
```

> ⚠️ **Windows Tip:** Use `http://127.0.0.1:3001` instead of `http://localhost:3001` as Docker Desktop may not forward IPv6 correctly.

---

## Step 7.2: Environment Variables

### Application Environment Variables

Add to `.env.local`:

```env
# Umami Analytics (Self-Hosted)
NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id-from-umami-dashboard
NEXT_PUBLIC_UMAMI_SCRIPT_URL=http://127.0.0.1:3001/script.js
```

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | The Website ID from Umami dashboard (UUID format) |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL` | URL where Umami tracking script is hosted |

**Note:** These variables are prefixed with `NEXT_PUBLIC_` because they need to be accessible in the browser (client-side script loading).

---

## Step 7.3: UmamiAnalytics Component

### File: `src/components/UmamiAnalytics.tsx`

**Purpose:** Client component that injects the Umami tracking script asynchronously using Next.js `Script` component.

**Key Implementation Details:**

```typescript
'use client';

import Script from 'next/script';

export default function UmamiAnalytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;

  // Only render if both environment variables are configured
  if (!websiteId || !scriptUrl) {
    return null;
  }

  return (
    <Script
      src={scriptUrl}
      data-website-id={websiteId}
      strategy="afterInteractive"
      defer
    />
  );
}
```

**Design Decisions:**

| Decision | Rationale |
|----------|-----------|
| `'use client'` directive | Required for `next/script` component |
| `strategy="afterInteractive"` | Loads script after page becomes interactive, preventing hydration errors |
| `defer` attribute | Defers script execution until HTML parsing is complete |
| Conditional rendering | Returns `null` if env vars not set, preventing errors in development |
| `data-website-id` attribute | Umami's standard method for identifying the tracked website |

---

## Step 7.4: Root Layout Integration

### File Modified: `src/app/layout.tsx`

**Changes:**
- Imported `UmamiAnalytics` component
- Added `<UmamiAnalytics />` inside the `<body>` tag

```typescript
import UmamiAnalytics from '@/components/UmamiAnalytics';

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <UmamiAnalytics />
      </body>
    </html>
  );
}
```

**Why root layout?**
- Ensures analytics runs across all routes
- Single integration point
- No hydration errors due to `afterInteractive` strategy

---

## Umami Dashboard Setup

### Post-Installation Steps

1. **Access Umami Dashboard:**
   ```
   http://127.0.0.1:3001
   ```

2. **Login:**
   - Username: `admin`
   - Password: `umami-admin-123`

3. **Add Website:**
   - Go to **Settings → Websites**
   - Click **Add Website**
   - Website Name: `CMS Cline`
   - Domain: `localhost`
   - Click **Save**

4. **Copy Website ID:**
   - The ID is a UUID (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
   - Add to `.env.local` as `NEXT_PUBLIC_UMAMI_WEBSITE_ID`

5. **Restart Next.js:**
   ```bash
   npm run dev
   ```

---

## Windows-Specific Fix

### Issue
On Windows, `localhost` resolves to IPv6 `::1` first, but Docker Desktop only forwards IPv4 connections.

### Solution
Use `http://127.0.0.1:3001` instead of `http://localhost:3001`

### Verification
```bash
# This may fail on Windows
curl http://localhost:3001

# This should work
curl http://127.0.0.1:3001
```

---

## Verification

### Build Status
```
✓ Compiled successfully in 9.9s
✓ Finished TypeScript in 7.1s
✓ Collecting page data using 7 workers in 6.3s
✓ Generating static pages using 7 workers (22/22) in 1249ms
```

### Container Status
```
NAMES             STATUS          PORTS
umami-analytics   Up 15 minutes   0.0.0.0:3001->3000/tcp
umami-database    Up 15 minutes   5432/tcp
```

### Internal Server Check
```
$ docker exec umami-analytics netstat -tlnp
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 0.0.0.0:3000            0.0.0.0:*               LISTEN
```

---

## Files Created/Modified

### New Files
```
docker-compose.umami.yml
src/components/UmamiAnalytics.tsx
```

### Modified Files
```
src/app/layout.tsx
README.md
.clinerules/memory.md
.clinerules/plan.md
```

---

## Documentation Updates

### README.md Additions

1. **Tech Stack Table:**
   - Added Umami as "Self-hosted analytics (Phase 7)"

2. **Environment Variables Section:**
   - Added Umami variables with comments

3. **New Section: "Umami Analytics Setup (Optional)":**
   - Docker Compose instructions
   - Default credentials
   - Post-installation steps
   - Windows-specific tip

4. **Development Status:**
   - Updated Phase 7 to ✅ completed

---

## Security Considerations

| Item | Recommendation |
|------|----------------|
| Default credentials | Change `ADMIN_USER` and `ADMIN_PASSWORD` in production |
| `APP_SECRET` | Use a cryptographically secure random string |
| Environment variables | Never commit `.env.local` to version control |
| Production deployment | Use HTTPS for both Umami and the CMS |

---

## Troubleshooting

### Umami Shows 0 Visitors

1. **Check environment variables are set:**
   ```bash
   # In terminal where npm run dev is running
   # You should see .env.local in the environment output
   ```

2. **Verify script is loading:**
   - Open DevTools → Network tab → filter "script"
   - Look for `script.js` from Umami

3. **Check browser console:**
   - Open DevTools Console
   - Look for errors related to Umami or script URL

4. **Verify Website ID:**
   - Ensure `NEXT_PUBLIC_UMAMI_WEBSITE_ID` matches the ID in Umami dashboard

### Container Won't Start

```bash
# Check logs
docker logs umami-analytics

# Restart containers
docker compose -f docker-compose.umami.yml restart

# Fresh start
docker compose -f docker-compose.umami.yml down -v
docker compose -f docker-compose.umami.yml up -d
```

---

## Next Steps for Production

1. Change default admin credentials in `docker-compose.umami.yml`
2. Use a strong `APP_SECRET` (generate with `openssl rand -base64 32`)
3. Configure HTTPS/SSL for Umami
4. Set up proper backup for PostgreSQL data volume
5. Consider using Umami's official cloud service instead of self-hosting for critical applications

---

## Git Commit

```
Phase 7: Self-Hosted Analytics (Umami)

- Created UmamiAnalytics component using next/script for async loading
- Added docker-compose.umami.yml for local Umami instance with PostgreSQL
- Integrated UmamiAnalytics in root layout
- Updated README with Umami setup instructions and Windows-specific fix
- Updated project memory and plan documentation
```

**Commit Hash:** `3eed30f`
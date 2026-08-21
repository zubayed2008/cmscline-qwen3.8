# Phase 15 Implementation: Internationalization (i18n)

**Status:** ✅ COMPLETED  
**Date:** 2026-08-21

---

## Overview
This document describes the implementation of Phase 15, which adds internationalization (i18n) support to the Enterprise CMS. This phase introduces multi-language support for the UI and content via locale detection, language switching, and structured translation files for English (en), Spanish (es), and French (fr).

> ⚠️ **Important Next.js 16 Convention:** In Next.js 16, the `middleware` file convention was **renamed to `proxy`**. Middleware must live at `src/proxy.ts` (root of `src/`, same level as `app`), not inside `src/app/`. A file named `middleware.tsx` inside `src/app/` is **never invoked**. The Phase 15 locale detection logic was correctly integrated into the existing `src/proxy.ts`.

---

## Step 15.1: i18n Utility

### File Created: `src/utils/i18n.ts`

**Purpose:** Centralized utility for locale detection, language switching, and localization management. Defines the `Locale` type and loads translation dictionaries statically from the locale JSON files.

**Locale Type:**
```typescript
export type Locale = 'en' | 'es' | 'fr';
```

**Translation Loading (static imports work on client & server):**
```typescript
import enCommon from '@/locales/en/common.json';
import esCommon from '@/locales/es/common.json';
import frCommon from '@/locales/fr/common.json';

const translations: Record<Locale, Record<string, Record<string, string>>> = {
  en: enCommon,
  es: esCommon,
  fr: frCommon,
};
```

**Functions:**
| Function | Purpose |
|----------|---------|
| `getLocale(cookieValue?)` | Returns the current (or cookie-provided) locale, with fallback to default |
| `setLocale(locale)` | Sets the `NEXT_LOCALE` cookie and `<html lang>`/`dir` attributes |
| `isLocale(locale, cookieValue?)` | Checks whether the current locale matches a given locale |
| `getSupportedLocales()` | Returns the array of supported locales (`['en', 'es', 'fr']`) |
| `getDefaultLocale()` | Returns the default locale from `NEXT_PUBLIC_DEFAULT_LOCALE` env (fallback `en`) |
| `formatDate(date, options?, locale?)` | Locale-aware date formatting via `Intl.DateTimeFormat` |
| `formatNumber(number, locale?)` | Locale-aware number formatting via `Intl.NumberFormat` |
| `formatCurrency(amount, currency?, locale?)` | Locale-aware currency formatting |
| `extractLocaleFromPath(pathname)` | Extracts a locale prefix from a path (e.g. `/en/about-us` → `'en'`) |
| `hasLocalePrefix(pathname)` | Checks whether a path has a locale prefix |
| `t(namespace, key, locale?)` | Looks up a translation by namespace/key with fallback to default locale, then the key itself |
| `getTranslations(locale?)` | Returns the full translation dictionary for a locale |

The `t()` helper is fully functional (not a placeholder) — it performs dictionary lookups across the statically imported JSON files with graceful fallback.

---

## Step 15.2: Translation Files

### Files Created: `src/locales/{en,es,fr}/common.json`

**Purpose:** Define localized strings for all three supported locales.

**Structure** (namespaces for scoping, with `{0}`-style placeholders where appropriate):
```json
{
  "common": { "home": "Home", "login": "Login", "logout": "Logout", "dashboard": "Dashboard", "search": "Search", "save": "Save", "delete": "Delete", ... },
  "navigation": { "hero": "Welcome to Our Company", "contact_us": "Contact Us", ... },
  "footer": { "copyright": "© {0} {1}. All rights reserved.", ... },
  "meta": { "title_template": "%s | {0}", "description": "...", "keywords": "..." },
  "ui": { "button_primary": "Primary Action", "upload_file": "Upload file", ... }
}
```

Each file contains translations for `common`, `navigation`, `footer`, `meta`, and `ui` namespaces. All JSON files were validated.

---

## Step 15.3: Locale Detection Proxy

### File Modified: `src/proxy.ts`

**Purpose:** Next.js 16.3.1 uses `proxy.ts` (formerly `middleware`). The Phase 15 locale detection was merged into the existing proxy alongside the existing rate-limiting logic. Locale detection runs for non-API (page) routes; rate limiting continues to run for API routes.

**Locale resolution priority:** `NEXT_LOCALE` cookie → `Accept-Language` header → default locale.

```typescript
const SUPPORTED_LOCALES = ['en', 'es', 'fr'];
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en';
const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

function resolveLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) return cookieLocale;

  const acceptLanguage = request.headers.get('accept-language');
  // negotiate against LOCALE_MAP, sorted by quality
  // fallback: DEFAULT_LOCALE
}
```

Inside `proxy()`, page routes resolve the locale and set the `NEXT_LOCALE` cookie (1-year `maxAge`) on the response when it changes:
```typescript
if (!isApiRoute(pathname)) {
  const locale = resolveLocale(request);
  const response = NextResponse.next();
  if (request.cookies.get(LOCALE_COOKIE_NAME)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE_NAME, locale, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 60*60*24*365 });
  }
  return response;
}
```

**Matcher expanded** to cover both API (rate limit) and page (locale) routes, excluding static assets:
```typescript
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

---

## Step 15.4: Locale Switch API

### File Created: `src/app/api/i18n/route.ts`

**Purpose:** Provides a `GET /api/i18n` endpoint that validates the requested locale, sets the `NEXT_LOCALE` cookie on the **response**, and redirects the user back to their originating page.

```typescript
export async function GET(request: NextRequest) {
  const newLocale = request.nextUrl.searchParams.get('locale');
  const redirectTo = request.nextUrl.searchParams.get('redirect') || '/';
  // validate locale
  // prevent open redirects (only same-origin relative paths)
  const response = NextResponse.redirect(new URL(safeRedirect, request.url));
  response.cookies.set('NEXT_LOCALE', newLocale, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60*60*24*365 });
  return response;
}
```

> **Fixes applied:** The original draft attempted `request.cookies.set(...)` (request cookies are **read-only**) and built a broken redirect URL. The final implementation sets the cookie on the `NextResponse.redirect()` response and redirects relative to a validated `redirect` query parameter used back to the originating page.
---

## Step 15.5: Locale Provider & Hooks

### File Created: `src/components/providers/LocaleProvider.tsx`

**Purpose:** Client-side locale state management and context consumption, exposing `useLocale()` and `useLocaleText()` hooks.

**Exports:**
| Export | Purpose |
|--------|---------|
| `useLocale()` | Returns `{ locale, changeLanguage }` context (throws if outside provider) |
| `useLocaleText()` | Returns the current locale string |
| `LocaleProvider` | Client component wrapping children in the locale context |
| `LocalizationContextType` / `LocaleProviderProps` | Type definitions |

`changeLanguage(locale)` updates React state, sets the `NEXT_LOCALE` cookie and `<html lang>`, and dispatches a `localeChange` custom event.

### File Created: `src/hooks/useLocale.ts`

**Purpose:** Re-exports the hooks/provider from `LocaleProvider.tsx` to keep a single source of truth.
```typescript
export {
  useLocale,
  useLocaleText,
  LocaleProvider,
  LocaleProvider as default,
  type LocalizationContextType,
  type LocaleProviderProps,
} from '@/components/providers/LocaleProvider';
```

> **Fixed:** The original `useLocale.ts` imported `LocalizationContext` (which was **not exported** from `LocaleProvider.tsx`, so the default import resolved to the component, not the context) → runtime failure. It is now a clean re-export.

---

## Step 15.6: Language Switcher Component

### File Created: `src/components/features/public/LanguageSwitcher.tsx`

**Purpose:** Client dropdown to switch the active site language. Displays the current locale, exposes the list of supported locales, and navigates to `/api/i18n` to persist the choice server-side.

```typescript
const router = useRouter();
const switchLocale = (locale: Locale) => {
  setIsOpen(false);
  const redirect = pathname || '/';
  router.push(`/api/i18n?locale=${locale}&redirect=${encodeURIComponent(redirect)}`);
};
```

> **Fixed (ESLint):** Uses `useRouter().push()` instead of `window.location.href` / `window.location.assign` to satisfy `@next/next/no-location-assign-relative-destination`. Removed `any` types.

### File Modified: `src/components/features/public/PublicHeader.tsx`

**Purpose:** Wired the `LanguageSwitcher` into the public header (desktop nav + mobile menu), accepting the `currentLocale` prop from the server layout.

---

## Step 15.7: Dynamic `lang` & Layout Wiring

### File Modified: `src/app/layout.tsx`

- Reads the `NEXT_LOCALE` cookie server-side (`cookies()` from `next/headers`) to set a dynamic `<html lang="...">`.
- Restored the **Geist font CSS variables** (`${geistSans.variable} ${geistMono.variable} h-full antialiased`) that were accidentally removed, and removed the unnecessary `<head />`.

```typescript
export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const lang = cookieLocale && supportedLocales.includes(cookieLocale) ? cookieLocale : 'en';
  return <html lang={lang} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>...
}
```

### File Modified: `src/app/(public)/layout.tsx`

- Reads the `NEXT_LOCALE` cookie server-side and passes `currentLocale` to the `PublicHeader` so the switcher highlights the active language.

---

## Step 15.8: Cleanup of Dead Code & Orphans

The Phase 15 changes introduced some broken/dead code which was cleaned up during verification:

| File | Action | Reason |
|------|--------|--------|
| `src/app/middleware.tsx` | **Deleted** | Dead file — Next.js 16 uses `src/proxy.ts` (proxy convention). A `middleware.tsx` inside `app/` is never invoked. Locale logic was merged into `src/proxy.ts`. |
| `src/utils/audit-middleware.ts` | **Deleted** | Orphan — its only consumer (the logout route) was removed; `NextAuth events.signOut` already writes logout audit logs. |
| `src/app/api/audit-logs/logout/route.ts` | **Deleted** | Dead route — `AdminHeader` still called it (404 noise). Removed the call; NextAuth's `events.signOut` handles logout audit. |
| `src/components/features/admin/AdminHeader.tsx` | **Modified** | Removed the `fetch('/api/audit-logs/logout', ...)` call (route deleted). Logout audit is handled by `events.signOut`. |
| `negotiator` dependency | **Removed** | Added to `package.json` but never used. Removed via `npm uninstall negotiator`. |

---

## Environment Variables

### Variable Used in Phase 15:
```env
NEXT_PUBLIC_DEFAULT_LOCALE=en
```

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_DEFAULT_LOCALE` | Default locale (fallback to `'en'`), read in `src/utils/i18n.ts` and `src/proxy.ts` |

> No new dependencies were added. The `negotiator` dependency that was previously added was removed as unused.

---

## Files Created/Modified

### New Files
```
src/utils/i18n.ts
src/locales/en/common.json
src/locales/es/common.json
src/locales/fr/common.json
src/components/providers/LocaleProvider.tsx
src/hooks/useLocale.ts
src/components/features/public/LanguageSwitcher.tsx
src/app/api/i18n/route.ts
```

### Modified Files
```text
src/proxy.ts
src/app/layout.tsx
src/app/(public)/layout.tsx
src/components/features/public/PublicHeader.tsx
src/components/features/admin/AdminHeader.tsx
```

### Deleted Files
```text
src/app/middleware.tsx
src/utils/audit-middleware.ts
src/app/api/audit-logs/logout/route.ts
```

---

## Validation

All changes were verified:
- **`npx tsc --noEmit`** — clean, no TypeScript errors
- **`npm run build`** — ✅ Compiled successfully; all routes incl. `/api/i18n` and the Proxy (Middleware) compiled
- **`npm test`** — ✅ 161/161 tests pass (10 suites)
- **ESLint** on all touched files — 0 errors, 0 warnings (remaining repo-wide lint issues are pre-existing in files from earlier phases)
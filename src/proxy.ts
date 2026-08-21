import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, RATE_LIMIT_CONFIG } from '@/utils/rate-limit';

/**
 * Next.js Proxy (formerly Middleware) for:
 *
 * 1. API Rate Limiting
 *    - Public API endpoints (GET /api/*): 100 requests per hour
 *    - Authenticated API endpoints (POST/PUT/DELETE /api/*): 1000 requests per hour
 *
 * 2. Locale Detection (i18n)
 *    - Detects the user's preferred locale from the NEXT_LOCALE cookie,
 *      Accept-Language header, or the default locale.
 *    - Persists the detected locale in the NEXT_LOCALE cookie.
 *
 * Exempts:
 * - /api/auth/* (handled separately in NextAuth route)
 * - /api/contact (handled separately in contact route)
 * - Static assets and Next.js internals
 */

// ==========================================
// i18n Locale Detection
// ==========================================
const SUPPORTED_LOCALES = ['en', 'es', 'fr'] as const;
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en';
const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

// Map browser language codes to supported locales
const LOCALE_MAP: Record<string, string> = {
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  es: 'es',
  'es-es': 'es',
  'es-mx': 'es',
  fr: 'fr',
  'fr-fr': 'fr',
  'fr-ca': 'fr',
};

/**
 * Resolve the preferred locale for a request.
 * Priority: cookie > Accept-Language header > default locale.
 */
function resolveLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(',')
      .map((lang) => {
        const parts = lang.trim().split(';');
        const code = parts[0].toLowerCase().replace(/["']/g, '').trim();
        const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) || 0 : 1;
        return { code, quality };
      })
      .sort((a, b) => b.quality - a.quality)
      .find(({ code }) => LOCALE_MAP[code] || LOCALE_MAP[code.split('-')[0]]);

    if (preferred) {
      return LOCALE_MAP[preferred.code] || LOCALE_MAP[preferred.code.split('-')[0]] || DEFAULT_LOCALE;
    }
  }

  return DEFAULT_LOCALE;
}

// Routes that have their own rate limiting
const EXEMPT_ROUTES = [
  '/api/auth',
  '/api/contact',
];

// Check if route is exempt from middleware rate limiting
function isExemptRoute(pathname: string): boolean {
  return EXEMPT_ROUTES.some((route) => pathname.startsWith(route));
}

// Check if route is an API route
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

// Get client IP from request
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply locale detection for non-API routes (pages)
  if (!isApiRoute(pathname)) {
    const locale = resolveLocale(request);
    const response = NextResponse.next();

    // Persist the locale cookie (only if it changed or is missing)
    if (request.cookies.get(LOCALE_COOKIE_NAME)?.value !== locale) {
      response.cookies.set(LOCALE_COOKIE_NAME, locale, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }

    return response;
  }

  // Skip exempt routes (they have their own rate limiting)
  if (isExemptRoute(pathname)) {
    return NextResponse.next();
  }

  // Get client IP
  const ip = getClientIp(request);

  // Determine rate limit based on HTTP method
  // POST/PUT/DELETE are considered authenticated operations (higher limit)
  // GET are public operations (lower limit)
  const method = request.method;
  const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  const config = isWriteOperation
    ? RATE_LIMIT_CONFIG.API_AUTHENTICATED
    : RATE_LIMIT_CONFIG.API_PUBLIC;

  const rateLimitKey = isWriteOperation
    ? `api:write:${ip}`
    : `api:read:${ip}`;

  // Apply rate limiting
  const { success, remaining } = await rateLimit(
    rateLimitKey,
    config.limit,
    config.window
  );

  if (!success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(config.window / 60000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(config.window / 1000).toString(),
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  }

  // Continue with rate limit headers
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', config.limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all API routes for rate limiting AND all page routes for locale detection.
     * Excludes:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
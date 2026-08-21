import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, RATE_LIMIT_CONFIG } from '@/utils/rate-limit';

/**
 * Next.js Middleware for API Rate Limiting
 *
 * Applies rate limiting based on route patterns:
 * - Public API endpoints (GET /api/*): 100 requests per hour
 * - Authenticated API endpoints (POST/PUT/DELETE /api/*): 1000 requests per hour
 *
 * Exempts:
 * - /api/auth/* (handled separately in NextAuth route)
 * - /api/contact (handled separately in contact route)
 * - Static assets and Next.js internals
 */

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

  // Skip non-API routes
  if (!isApiRoute(pathname)) {
    return NextResponse.next();
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
     * Match all API routes except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/api/(.*)',
  ],
};
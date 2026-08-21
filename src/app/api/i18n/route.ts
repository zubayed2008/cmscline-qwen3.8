import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'es', 'fr'] as const;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const newLocale = searchParams.get('locale');
  const redirectTo = searchParams.get('redirect') || '/';

  if (!newLocale) {
    return NextResponse.json({ error: 'Missing locale parameter' }, { status: 400 });
  }

  // Validate locale
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(newLocale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
  }

  // Prevent open redirects: only allow same-origin relative paths
  const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';

  // Set cookie on the RESPONSE (request cookies are read-only)
  const response = NextResponse.redirect(new URL(safeRedirect, request.url));
  response.cookies.set('NEXT_LOCALE', newLocale, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return response;
}
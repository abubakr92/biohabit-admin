import { NextRequest, NextResponse } from 'next/server';

const COOKIE = 'biohabit_session';
const MAX_AGE = 60 * 60 * 8;

export function middleware(request: NextRequest) {
  const session = request.cookies.get(COOKIE);
  if (!session) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  // Rolling refresh, so an admin who is still signed in to Firebase is never bounced mid-edit
  // just because the routing cookie reached its fixed eight-hour age.
  const response = NextResponse.next();
  response.cookies.set(COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
  return response;
}

export const config = {
  matcher: [
    '/stacks/:path*',
    '/micro-actions/:path*',
    '/labels/:path*',
    '/users/:path*',
    '/routines/:path*',
  ],
};

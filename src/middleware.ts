import { NextRequest, NextResponse } from 'next/server';
export function middleware(request: NextRequest) {
  if (!request.cookies.get('biohabit_session')) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = {
  matcher: ['/stacks/:path*', '/micro-actions/:path*', '/labels/:path*', '/users/:path*'],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * SEO URL rules:
 * - All directory URLs lowercase (301 redirect if not)
 * - /in and /in/* → 301 to root-level URLs (e.g. /in/kerala → /kerala)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 301: /in → /, /in/kerala → /kerala, /in/kerala/ernakulam → /kerala/ernakulam, etc.
  if (pathname === '/in' || pathname.startsWith('/in/')) {
    const newPath = pathname === '/in' ? '/' : pathname.slice(3) || '/';
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.redirect(url, 301);
  }

  // 301: force lowercase path (no query change). Skip static/admin/api paths if desired.
  const lower = pathname.toLowerCase();
  if (pathname !== lower) {
    const url = request.nextUrl.clone();
    url.pathname = lower;
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/in',
    '/in/:path*',
    '/((?!_next|api|favicon|.*\\.).*)', // lowercase redirect for all non-static
  ],
};

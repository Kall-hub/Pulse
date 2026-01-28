import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const authCookie = req.cookies.get('pulse_auth')?.value;

  // Allow public paths
  const publicPaths = ['/login'];
  const isPublic = publicPaths.some(p => pathname.startsWith(p));
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/public') || pathname === '/favicon.ico';

  if (isPublic || isStatic) {
    return NextResponse.next();
  }

  if (!authCookie) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // No-cache headers for protected routes to prevent back-forward cache
  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
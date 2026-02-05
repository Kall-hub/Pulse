import { NextResponse } from 'next/server';

export function middleware(req) {
  // Middleware is disabled for static export
  // Auth is handled at the page level
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
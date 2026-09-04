import { NextResponse } from 'next/server';

export function proxy(request) {
  const pathname = request.nextUrl.pathname;
  if (pathname === '/') return NextResponse.redirect(new URL('/en', request.url));
  const first = pathname.split('/')[1];
  const headers = new Headers(request.headers);
  headers.set('x-ee-locale', ['en', 'bn'].includes(first) ? first : 'en');
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] };

import { NextResponse } from 'next/server';

export function proxy(request) {
  const pathname = request.nextUrl.pathname;
  if (pathname === '/') return NextResponse.redirect(new URL('/en', request.url));
  const first = pathname.split('/')[1];
  const headers = new Headers(request.headers);
  const locale = ['en', 'bn'].includes(first) ? first : 'en';
  headers.set('x-ee-locale', locale);
  // next-intl resolves `requestLocale` from this header (normally set by its own middleware);
  // without it every request, including /bn, falls back to the English messages.
  headers.set('X-NEXT-INTL-LOCALE', locale);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] };

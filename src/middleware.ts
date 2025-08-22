// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const WAGMI_COOKIE_KEY = 'wagmi.store';

const PUBLIC_ROUTES = ['/login'];
const PROTECTED_PREFIXES: string[] = ['/'];

function isAssetPath(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/assets') ||
    /\.[a-zA-Z0-9]+$/.test(pathname) // files like .js, .css, .png
  );
}

function isConnectedFromWagmiCookie(raw?: string): boolean {
  if (!raw) return false;

  try {
    const decoded = raw.startsWith('%7B') ? decodeURIComponent(raw) : raw;

    const data = JSON.parse(decoded);
    const state = data?.state ?? data;
    const current = state?.current;
    const map = state?.connections;

    // Expect: { __type: "Map", value: [ [ "<uid>", { accounts: [...] } ], ... ] }
    if (map?.__type !== 'Map' || !Array.isArray(map?.value) || !current)
      return false;

    const pair = map.value.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => Array.isArray(p) && p.length === 2 && p[0] === current
    );
    const accounts = pair?.[1]?.accounts;

    return Array.isArray(accounts) && accounts.length > 0;
  } catch {
    return false;
  }
}

function isProtectedRoute(pathname: string): boolean {
  const isPublic = PUBLIC_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  if (isPublic) return false;
  if (PROTECTED_PREFIXES.length === 0) return true;

  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (isAssetPath(pathname)) return NextResponse.next();

  const wagmiCookie = req.cookies.get(WAGMI_COOKIE_KEY)?.value;
  const isConnected = isConnectedFromWagmiCookie(wagmiCookie);

  console.log(isConnected);

  // 1) Gate protected routes
  if (!isConnected && isProtectedRoute(pathname)) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  // 2) If connected, keep users out of /login (optionally honor ?next)
  if (
    isConnected &&
    (pathname === '/login' || pathname.startsWith('/login/'))
  ) {
    const nextParam = req.nextUrl.searchParams.get('next');
    const url = new URL('/', req.url);

    if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
      url.pathname = nextParam;
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};

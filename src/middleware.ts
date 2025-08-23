// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const WAGMI_COOKIE_KEY = 'wagmi.store';

const PUBLIC_ROUTES = ['/login', '/signup'];
const PROTECTED_PREFIXES = [
  '/',
  '/points',
  '/settings',
  '/transactions',
  '/vaults',
];

function isAssetPath(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/assets') ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
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

function isAuthRoute(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/signup' ||
    pathname.startsWith('/signup/')
  );
}

function redirectWithNext(req: NextRequest, dest: string, nextPath?: string) {
  const url = new URL(dest, req.url);
  const candidate = nextPath ?? req.nextUrl.searchParams.get('next') ?? '';
  if (candidate && candidate.startsWith('/') && !candidate.startsWith('//')) {
    url.searchParams.set('next', candidate);
  }
  return NextResponse.redirect(url);
}

function getAddressFromWagmiCookie(raw?: string): string | null {
  if (!raw) return null;
  try {
    const decoded = raw.startsWith('%7B') ? decodeURIComponent(raw) : raw;
    const data = JSON.parse(decoded);
    const state = data?.state ?? data;
    const current = state?.current;
    const map = state?.connections;
    if (map?.__type !== 'Map' || !Array.isArray(map?.value) || !current)
      return null;
    // Expect: [ [ "<uid>", { accounts: [...] } ], ... ]
    const pair = map.value.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => Array.isArray(p) && p.length === 2 && p[0] === current
    );

    const accounts = pair?.[1]?.accounts;
    const addr = accounts?.[0];
    return typeof addr === 'string' ? addr : null;
  } catch {
    return null;
  }
}

async function isOnboarded(
  req: NextRequest,
  address: string
): Promise<boolean> {
  const base = new URL(req.url);
  const headers = {
    'content-type': 'application/json',
    cookie: req.headers.get('cookie') ?? '',
  };

  // a) user lookup
  const userRes = await fetch(new URL('/api/get-user', base), {
    method: 'POST',
    headers,
    body: JSON.stringify({ address }),
    cache: 'no-store',
  });
  if (userRes.status !== 200) return false;
  const { user } = await userRes.json();
  if (!user?.id) return false;

  // b) card lookup
  const cardRes = await fetch(new URL('/api/get-card', base), {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId: user.id }),
    cache: 'no-store',
  });
  return cardRes.status === 200;
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (isAssetPath(pathname)) return NextResponse.next();

  const address = getAddressFromWagmiCookie(
    req.cookies.get(WAGMI_COOKIE_KEY)?.value
  );
  const isConnected = !!address;

  // a) gate protected routes
  if (isProtectedRoute(pathname)) {
    if (!isConnected) {
      return redirectWithNext(req, '/login', pathname + search);
    }

    const onboarded = await isOnboarded(req, address!);
    if (!onboarded) {
      return redirectWithNext(req, '/signup', pathname + search);
    }
  }

  // a) auth routes
  if (isAuthRoute(pathname)) {
    if (!isConnected) return NextResponse.next();

    const onboarded = await isOnboarded(req, address!);
    if (onboarded) {
      // connected + onboarded → keep them out of /login AND /signup
      return redirectWithNext(req, '/', pathname + search);
    }

    // connected but not onboarded:
    // visiting /login → move them to /signup (preserve ?next)
    if (pathname === '/login' || pathname.startsWith('/login/')) {
      return redirectWithNext(req, '/signup');
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};

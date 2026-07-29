import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory sliding window rate limiter for Edge runtime instances
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // Max 60 requests/min per IP
const MAX_TRACKED_CLIENTS = 10_000;

function clientAddress(request: NextRequest) {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp && realIp.length <= 64) return realIp;

  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',', 1)[0]?.trim();
  if (forwardedIp && forwardedIp.length <= 64) return forwardedIp;

  return 'unknown';
}

function makeRoomForClient(now: number) {
  if (ipRequestCounts.size < MAX_TRACKED_CLIENTS) return;

  for (const [ip, data] of ipRequestCounts) {
    if (now > data.resetTime) ipRequestCounts.delete(ip);
  }

  while (ipRequestCounts.size >= MAX_TRACKED_CLIENTS) {
    const oldestIp = ipRequestCounts.keys().next().value;
    if (!oldestIp) break;
    ipRequestCounts.delete(oldestIp);
  }
}

function isSameOrigin(value: string, host: string | null) {
  if (!host) return false;
  try {
    return new URL(value).host === host;
  } catch {
    return false;
  }
}

const unauthorized = () => new NextResponse('Authentication required.', {
  status: 401,
  headers: {
    'WWW-Authenticate': 'Basic realm="Boomer & Kev Studio", charset="UTF-8"',
    'Cache-Control': 'no-store',
  },
});

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // n8n-only endpoints keep their own Bearer authentication because Basic Auth
  // would replace the Authorization header they already validate.
  const hasRouteSpecificAuth = pathname === '/api/radar' || pathname === '/api/cron/trend-hunter';
  if (!hasRouteSpecificAuth) {
    const user = process.env.STUDIO_AUTH_USER;
    const password = process.env.STUDIO_AUTH_PASSWORD;

    if (!user || !password) {
      if (process.env.NODE_ENV === 'production') {
        return new NextResponse('Studio authentication is not configured.', {
          status: 503,
          headers: { 'Cache-Control': 'no-store' },
        });
      }
    } else {
      const expected = `Basic ${btoa(`${user}:${password}`)}`;
      if (request.headers.get('authorization') !== expected) return unauthorized();
    }
  }

  // Protect API routes
  if (pathname.startsWith('/api')) {
    const ip = clientAddress(request);
    const now = Date.now();

    // 1. IP Rate Limiting
    const rateLimitData = ipRequestCounts.get(ip);
    if (!rateLimitData || now > rateLimitData.resetTime) {
      // Initialize or reset window
      if (!rateLimitData) makeRoomForClient(now);
      ipRequestCounts.set(ip, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW_MS,
      });
    } else {
      rateLimitData.count += 1;
      if (rateLimitData.count > MAX_REQUESTS_PER_WINDOW) {
        return new NextResponse(
          JSON.stringify({ error: 'Rate limit exceeded. Too many requests.' }),
          {
            status: 429,
            headers: {
              'Cache-Control': 'no-store',
              'Content-Type': 'application/json',
              'Retry-After': String(Math.max(1, Math.ceil((rateLimitData.resetTime - now) / 1000))),
            },
          }
        );
      }
    }

    // 2. CSRF Mitigation for Mutation Requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');
      const referer = request.headers.get('referer');

      // If origin header is present, verify it matches our host
      if (origin && !isSameOrigin(origin, host)) {
        return new NextResponse(
          JSON.stringify({ error: 'Cross-Site Request Forgery (CSRF) protection triggered.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      } 
      // Fallback: If origin is missing (e.g. older browsers), check referer
      else if (!origin && referer && !isSameOrigin(referer, host)) {
        return new NextResponse(
          JSON.stringify({ error: 'CSRF protection triggered (Referer mismatch).' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  return NextResponse.next();
}

// Protect pages and APIs. Public campaign assets and Next.js internals bypass auth.
export const config = {
  matcher: ['/((?!_next/static|_next/image|assets/|favicon.ico).*)'],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory sliding window rate limiter for Edge runtime instances
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // Max 60 requests/min per IP

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
  const hasRouteSpecificAuth = pathname === '/api/radar' || pathname.startsWith('/api/cron/');
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
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();

    // 1. IP Rate Limiting
    const rateLimitData = ipRequestCounts.get(ip);
    if (!rateLimitData || now > rateLimitData.resetTime) {
      // Initialize or reset window
      ipRequestCounts.set(ip, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW_MS,
      });
    } else {
      rateLimitData.count += 1;
      if (rateLimitData.count > MAX_REQUESTS_PER_WINDOW) {
        return new NextResponse(
          JSON.stringify({ error: 'Rate limit exceeded. Too many requests.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. CSRF Mitigation for Mutation Requests (POST/PUT/DELETE)
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');
      const referer = request.headers.get('referer');

      // If origin header is present, verify it matches our host
      if (origin) {
        const originUrl = new URL(origin);
        if (host && originUrl.host !== host) {
          return new NextResponse(
            JSON.stringify({ error: 'Cross-Site Request Forgery (CSRF) protection triggered.' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } 
      // Fallback: If origin is missing (e.g. older browsers), check referer
      else if (referer) {
        const refererUrl = new URL(referer);
        if (host && refererUrl.host !== host) {
          return new NextResponse(
            JSON.stringify({ error: 'CSRF protection triggered (Referer mismatch).' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }
  }

  return NextResponse.next();
}

// Protect pages and APIs. Public campaign assets and Next.js internals bypass auth.
export const config = {
  matcher: ['/((?!_next/static|_next/image|assets/|favicon.ico).*)'],
};

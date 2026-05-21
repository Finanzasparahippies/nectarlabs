import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Exclude system paths
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/static') ||
    url.pathname.includes('.') // Exclude static files like favicon.ico, logo.png, widget.js
  ) {
    return NextResponse.next();
  }

  // Define system domains to ignore (i.e. Nectar Labs main site)
  const systemDomains = [
    'localhost:3000',
    '127.0.0.1:3000',
    'localhost:3002',
    'nectarlabs.dev',
    'www.nectarlabs.dev',
    'staging.nectarlabs.dev',
    'www.staging.nectarlabs.dev',
  ];

  // Check if current hostname is a main system domain
  const isSystemDomain = systemDomains.some(
    (domain) => hostname.toLowerCase() === domain || hostname.toLowerCase().startsWith(domain + ':')
  );

  if (!isSystemDomain) {
    // Determine the identifier (subdomain or custom domain)
    let identifier = hostname.toLowerCase();

    // Check if it's a subdomain of nectarlabs.dev or localhost
    if (hostname.includes('.nectarlabs.dev')) {
      identifier = hostname.split('.nectarlabs.dev')[0];
    } else if (hostname.includes('.localhost:3000')) {
      identifier = hostname.split('.localhost:3000')[0];
    } else if (hostname.includes('.localhost:3002')) {
      identifier = hostname.split('.localhost:3002')[0];
    } else if (hostname.includes('.localhost')) {
      identifier = hostname.split('.localhost')[0];
    }

    // Ignore 'www' subdomain if it's parsed
    if (identifier !== 'www' && identifier !== 'api' && identifier !== 'admin' && identifier !== 'staging') {
      // Rewrite to internal dynamic tenant route
      url.pathname = `/tenants/${identifier}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

// See Next.js middleware documentation for matching paths
export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. Static files (e.g. favicon.ico, widget.js)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|widget.js|.*\\.).*)',
  ],
};

import fs from 'node:fs';
import path from 'node:path';
import { CACHE_CONTENT } from './src/lib/cachePolicy.js';
import { MALFORMED_SLUG_PATTERN } from './src/lib/malformedSlug.js';

const readJson = (name, fallback) => {
  const file = path.join(process.cwd(), 'data', name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : fallback;
};

// DSA redirects: { oldSlug: newSlug }, every destination is a real /problems page.
const slugRedirects = readJson('slug-redirects.json', {});
// slug-redirects-cp.json (993 old CP slugs) is no longer expanded into 993 route rules (PERF-03, Next warns above
// 1,000 custom routes). All of them are malformed (leading/trailing hyphen), so ONE pattern rule covers them.

/* SEC-05. Enforced: only directives that cannot break the app (framing, base-uri, object-src, form-action) plus the
   usual hardening headers. The full CSP is Report-Only on purpose: Firebase popup sign-in loads scripts/iframes from
   Google hosts and a wrong enforced policy would lock people out - watch the browser console for violations, then
   promote it to Content-Security-Policy. (Next injects inline scripts, hence 'unsafe-inline' until nonces are added.) */
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://apis.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://lh3.googleusercontent.com https://www.google.com https://*.gstatic.com https://img.logo.dev",
      "font-src 'self' data:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com",
      'frame-src https://*.firebaseapp.com https://accounts.google.com',
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Every route below is either fully static (generateStaticParams) or a
  // client component behind auth (Dashboard/Bookmarks/History/Roadmap) -
  // no server-side data fetching per-request, so `output: 'export'` is not
  // forced here (Firebase auth needs a real runtime for redirects), but
  // every content route IS statically generated at build time. See
  // docs note in src/app/problems/[slug]/page.js.
  reactStrictMode: true,
  images: {
    // No remote problem/company images yet - dynamic OG images are their
    // own generated routes (see opengraph-image.js files), not next/image.
    unoptimized: true,
  },

  // The data-correction pass cleaned 1,001 malformed slugs (trailing/double
  // hyphens, e.g. "two-sum-hashing-" -> "two-sum-hashing") before this
  // rebuild ever started. If the OLD site had any of those malformed URLs
  // indexed by Google or bookmarked by a user, this is what keeps them
  // from becoming dead links instead of 404ing.
  // BUG-140: only 8 of the 1,001 point at a real DSA page, those stay
  // permanent (308). The other 993 were CP problems, which have no
  // /problems/<slug> page, so they used to redirect into a 404. They now go
  // to /cp as ONE TEMPORARY pattern redirect: a permanent one would wrongly
  // pass the old URLs' ranking to the list page.
  async redirects() {
    const dsa = Object.entries(slugRedirects).map(([oldSlug, newSlug]) => ({
      source: `/problems/${oldSlug}`,
      destination: `/problems/${newSlug}`,
      permanent: true,
    }));
    // Listed after the 8 explicit rules above, so those still win for their own slugs.
    const malformed = {
      source: `/problems/:slug(${MALFORMED_SLUG_PATTERN})`,
      destination: '/cp',
      permanent: false,
    };
    return [...dsa, malformed];
  },

  // BUG-121: one explicit cache policy for the generated JSON (see
  // src/lib/cachePolicy.js). Client code comments refer to it.
  // BUG-26: optional same-origin proxy for Firebase's auth helper pages. With authDomain set to this site's own host,
  // sign-in keeps working where browsers partition third-party storage (Safari, recent Chrome). Off unless enabled.
  async rewrites() {
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_PROXY !== '1' || !project) return [];
    const upstream = `https://${project}.firebaseapp.com`;
    return [
      { source: '/__/auth/:path*', destination: `${upstream}/__/auth/:path*` },
      { source: '/__/firebase/:path*', destination: `${upstream}/__/firebase/:path*` },
    ];
  },

  async headers() {
    return [
      { source: '/api/solutions/:slug', headers: [{ key: 'Cache-Control', value: CACHE_CONTENT }] },
      { source: '/data/:path*', headers: [{ key: 'Cache-Control', value: CACHE_CONTENT }] },
      // SEC-05: security headers for every route.
      { source: '/:path*', headers: SECURITY_HEADERS },
    ];
  },

  // PERF-02: the solutions JSON (190 MB) is only read at build time (the API route is force-static) and the public
  // data copy is served as plain static files, so neither belongs in any serverless function bundle.
  outputFileTracingExcludes: {
    '/*': ['./content/solutions/**/*', './public/data/**/*'],
  },
};

export default nextConfig;

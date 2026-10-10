import fs from 'node:fs';
import path from 'node:path';
import { CACHE_CONTENT } from './src/lib/cachePolicy.js';
import { MALFORMED_SLUG_PATTERN } from './src/lib/malformedSlug.js';

const readJson = (name, fallback) => {
  const file = path.join(process.cwd(), 'data', name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : fallback;
};

const slugRedirects = readJson('slug-redirects.json', {});

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
      "worker-src 'self'",
      "manifest-src 'self'",
      'frame-src https://*.firebaseapp.com https://accounts.google.com',
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },

  async redirects() {
    const dsa = Object.entries(slugRedirects).map(([oldSlug, newSlug]) => ({
      source: `/problems/${oldSlug}`,
      destination: `/problems/${newSlug}`,
      permanent: true,
    }));
    const malformed = {
      source: `/problems/:slug(${MALFORMED_SLUG_PATTERN})`,
      destination: '/cp',
      permanent: false,
    };
    return [...dsa, malformed];
  },

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
      { source: '/:path*', headers: SECURITY_HEADERS },
      // the service worker file and its switch must never be cached, or a bad version could not be replaced
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'text/javascript; charset=utf-8' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      { source: '/sw-config.json', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
      { source: '/offline.html', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] },
    ];
  },

  outputFileTracingExcludes: {
    '/*': ['./content/solutions/**/*', './public/data/**/*'],
  },
};

export default nextConfig;

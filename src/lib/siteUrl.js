// Single source of truth for the public site URL. Author: Satvik Hemant Gupta

// Pure resolver so tests can pass a fake env
export function resolveSiteUrl(env) {
  const explicit = env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel)
    return `https://${vercel.replace(/^https?:\/\//, '')}`.replace(/\/+$/, '');

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL is required in production ' +
        '(or set VERCEL_PROJECT_PRODUCTION_URL). Refusing to use localhost.',
    );
  }
  return 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl(process.env);

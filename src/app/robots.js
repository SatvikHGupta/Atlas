import { SITE_URL } from '../lib/siteUrl.js';

// Dynamic (app/robots.js) instead of a static public/robots.txt so the rules live in code, next to the routes they describe, rather than a hand-maintained file that can drift from the actual route list.
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Signed-in-only pages: nothing useful for a logged-out crawler to index, and progress/bookmarks data is per-user anyway.
        disallow: ['/dashboard', '/bookmarks', '/history', '/login', '/settings'],
      },
      // Block AI training crawlers specifically, separate from the general "*" rule above - this is a deliberate opt-out of training use, not a search-indexing decision.
      // SEC-16: training-crawler tokens. Vendors rename these from time to time - re-check their docs now and then.
      ...['GPTBot', 'CCBot', 'ClaudeBot', 'anthropic-ai', 'Claude-Web', 'Google-Extended', 'Applebot-Extended', 'PerplexityBot', 'Bytespider']
        .map((userAgent) => ({ userAgent, disallow: '/' })),
    ],
    // BUG-167: SITE_URL throws in production if no real URL is configured.
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

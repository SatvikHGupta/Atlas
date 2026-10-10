import { SITE_URL } from '../lib/siteUrl.js';

// Dynamic (app/robots.js) instead of a static public/robots.txt so the rules
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/bookmarks', '/history', '/login', '/settings'],
      },
      ...['GPTBot', 'CCBot', 'ClaudeBot', 'anthropic-ai', 'Claude-Web', 'Google-Extended', 'Applebot-Extended', 'PerplexityBot', 'Bytespider']
        .map((userAgent) => ({ userAgent, disallow: '/' })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

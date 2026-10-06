// ONE place that says what the public URL of every entity is. Canonical tags, sitemap entries, JSON-LD breadcrumbs and
// redirect targets all call these functions, so a route change is a one-file change plus a contract test (ATLAS-BUG-009,
// 010, 018). Paths are site-relative; metadataBase / SITE_URL turn them into absolute URLs. Author: Satvik Hemant Gupta
import { canonicalSlugFor } from '../constants/canonicalTwins.js';

export const routes = {
  home: () => '/',
  problems: () => '/problems',
  // a canonical twin (a duplicate import of the same problem) is identified by the ORIGINAL's path
  problem: (slug) => `/problems/${canonicalSlugFor(slug)}`,
  cp: () => '/cp',
  companies: () => '/companies',
  company: (id) => `/companies/${id}`,
  patterns: () => '/patterns',
  pattern: (slug) => `/patterns/${slug}`,
  notes: () => '/notes',
  note: (slug) => `/notes/${slug}`,
  roadmap: () => '/roadmap',
  roadmapLevel: (level) => `/roadmap/${level}`,
  privacy: () => '/privacy',
  terms: () => '/terms',
  about: () => '/about',
  contact: () => '/contact',
};

/** Next.js `alternates` for a route: always the entity's own clean path, never the request URL (no query strings, no twins). */
export const canonicalAlternates = (path) => ({ canonical: path });

/** Absolute URL for a path (sitemap, JSON-LD). The root has no trailing slash, matching the existing sitemap. */
export const absoluteUrl = (siteUrl, path) => `${siteUrl.replace(/\/+$/, '')}${path === '/' ? '' : path}`;

/** True when this slug is a duplicate whose canonical page lives at another slug. */
export const isCanonicalTwin = (slug) => canonicalSlugFor(slug) !== slug;

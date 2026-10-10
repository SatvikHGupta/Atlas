// ONE place that says what the public URL of every entity. Author: Satvik Hemant Gupta
import { canonicalSlugFor } from '../constants/canonicalTwins.js';

export const routes = {
  home: () => '/',
  problems: () => '/problems',
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

// Next.js `alternates` for a route
export const canonicalAlternates = (path) => ({ canonical: path });

// Absolute URL for a path (sitemap, JSON-LD)
export const absoluteUrl = (siteUrl, path) => `${siteUrl.replace(/\/+$/, '')}${path === '/' ? '' : path}`;

// True when this slug is a duplicate whose canonical page lives at another slug
export const isCanonicalTwin = (slug) => canonicalSlugFor(slug) !== slug;

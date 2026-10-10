import { getEducationalLevel } from './difficulty.utils.js';
import { SITE_URL as BASE } from './siteUrl.js';

// serialise JSON for a <script> tag
export function safeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// BreadcrumbList - the one schema type worth putting on every content detail
export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${BASE}${item.path}`,
    })),
  };
}

// TechArticle - used on note reader pages only
export function articleSchema({ headline, description, url }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline,
    description,
    url: `${BASE}${url}`,
    author: { '@type': 'Organization', name: 'Atlas' },
  };
}

// LearningResource - used on problem detail pages
export function learningResourceSchema({ name, description, url, difficulty }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name,
    description,
    url: `${BASE}${url}`,
    ...(getEducationalLevel(difficulty) ? { educationalLevel: getEducationalLevel(difficulty) } : {}),
  };
}

import { getEducationalLevel } from './difficulty.utils.js';
import { SITE_URL as BASE } from './siteUrl.js';

// BUG-151: serialise JSON for a <script> tag. Escapes the characters that can
// close the tag or break the script context (<, >, &, U+2028, U+2029).
export function safeJsonLd(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/* BreadcrumbList - the one schema type worth putting on every content detail page. `items` is an ordered array of {name, path} from Home down to the current page; `path` is site-relative ("/problems/two-sum"). FAQPage schema is deliberately not used anywhere (Google restricted rich results for it), and ItemList on the list pages was judged low-value (they're filtered/paginated, not a fixed canonical list) - skipped. */
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

/** TechArticle - used on note reader pages only. */
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

/** LearningResource - used on problem detail pages (a worked practice problem, not a generic article). */
export function learningResourceSchema({ name, description, url, difficulty }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name,
    description,
    url: `${BASE}${url}`,
    // BUG-17: a missing difficulty omits the field instead of claiming 'Advanced'
    ...(getEducationalLevel(difficulty) ? { educationalLevel: getEducationalLevel(difficulty) } : {}),
  };
}

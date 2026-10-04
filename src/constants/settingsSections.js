// Registry of Settings pages. To add a new settings page: (1) add an entry here, (2) create src/app/settings/<slug>/page.js
// that renders its component. The sidebar, the auth gate and the redirect from /settings all read this list, so nothing else
// needs touching. Author: Satvik Hemant Gupta
//
// requiresAuth: false = reachable signed-out too (a site preference, not account data).
export const SETTINGS_SECTIONS = [
  { slug: 'profile',    label: 'Profile',    requiresAuth: true  },
  { slug: 'appearance', label: 'Appearance', requiresAuth: false },
  { slug: 'account',    label: 'Account',    requiresAuth: true  },
  { slug: 'data',       label: 'Data',       requiresAuth: true  },
];

export const settingsPath = (slug) => `/settings/${slug}`;

/** The section a pathname belongs to ('/settings/data' -> data section), or null for '/settings' itself. */
export function sectionForPath(pathname) {
  const slug = String(pathname || '').split('/')[2];
  return SETTINGS_SECTIONS.find((s) => s.slug === slug) || null;
}

/** Where a visitor lands on bare /settings: Profile when signed in, Appearance (the only open page) when not. */
export const defaultSectionSlug = (isAuthenticated) => (isAuthenticated ? 'profile' : 'appearance');

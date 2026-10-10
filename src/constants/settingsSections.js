// Registry of Settings pages. Author: Satvik Hemant Gupta
export const SETTINGS_SECTIONS = [
  { slug: 'profile',    label: 'Profile',    requiresAuth: true  },
  { slug: 'appearance', label: 'Appearance', requiresAuth: false },
  { slug: 'account',    label: 'Account',    requiresAuth: true  },
];

export const settingsPath = (slug) => `/settings/${slug}`;

// The section a pathname belongs
export function sectionForPath(pathname) {
  const slug = String(pathname || '').split('/')[2];
  return SETTINGS_SECTIONS.find((s) => s.slug === slug) || null;
}

// Where a visitor lands on bare /settings
export const defaultSectionSlug = (isAuthenticated) => (isAuthenticated ? 'profile' : 'appearance');

// Single source of truth for primary navigation. Author: Satvik Hemant Gupta
export const NAV_LINKS = [
  { to: '/problems',  label: 'DSA Problems', short: 'DSA' },
  { to: '/cp',        label: 'CP Problems',  short: 'CP' },
  { to: '/roadmap',   label: 'Roadmap',      short: 'Roadmap' },
  { to: '/notes',     label: 'Notes',        short: 'Notes' },
  { to: '/companies', label: 'Companies',    short: 'Companies' },
  { to: '/patterns',  label: 'Patterns',     short: 'Patterns' },
  { to: '/dashboard', label: 'Dashboard',    short: 'Dashboard' },
];

export const BOTTOM_PRIMARY_PATHS = ['/problems', '/cp', '/roadmap', '/dashboard'];

export const BOTTOM_PRIMARY = NAV_LINKS.filter((l) => BOTTOM_PRIMARY_PATHS.includes(l.to));
export const BOTTOM_MORE = NAV_LINKS.filter((l) => !BOTTOM_PRIMARY_PATHS.includes(l.to));

export const isActivePath = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`);

// Everything the bottom bar's More sheet lists (the bar itself holds BOTTOM_PRIMARY)
export const MORE_LINKS = [
  ...BOTTOM_MORE,
  { to: '/bookmarks', label: 'Bookmarks' },
  { to: '/history',   label: 'History' },
  { to: '/settings',  label: 'Settings' },
  { to: '/about',     label: 'About' },
  { to: '/contact',   label: 'Contact' },
];

// Single source of truth for primary navigation. Navbar (desktop) and BottomNav (mobile) both read from here, so a link
// can never exist on one and silently vanish from the other (ATLAS-BUG-006). Author: Satvik Hemant Gupta
export const NAV_LINKS = [
  { to: '/problems',  label: 'DSA Problems', short: 'DSA' },
  { to: '/cp',        label: 'CP Problems',  short: 'CP' },
  { to: '/roadmap',   label: 'Roadmap',      short: 'Roadmap' },
  { to: '/notes',     label: 'Notes',        short: 'Notes' },
  { to: '/companies', label: 'Companies',    short: 'Companies' },
  { to: '/patterns',  label: 'Patterns',     short: 'Patterns' },
  { to: '/dashboard', label: 'Dashboard',    short: 'Dashboard' },
];

// Mobile bottom bar: four always-visible destinations + "More". Everything else in NAV_LINKS lives under More.
export const BOTTOM_PRIMARY_PATHS = ['/problems', '/cp', '/roadmap', '/dashboard'];

export const BOTTOM_PRIMARY = NAV_LINKS.filter((l) => BOTTOM_PRIMARY_PATHS.includes(l.to));
export const BOTTOM_MORE = NAV_LINKS.filter((l) => !BOTTOM_PRIMARY_PATHS.includes(l.to));

export const isActivePath = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`);

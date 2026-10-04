// Validates post-login return paths so ?from= can never leave the site.
// Author: Satvik Hemant Gupta

import { toInternalPath } from './urlPolicy.js';

// BUG-078 / ATLAS-BUG-005 / 015: accept only same-site paths such as "/problems?tab=cp". All the normalisation-aware
// checks (backslash = slash, tab/newline hiding a host, encoded // and \, scheme-in-first-segment) live in urlPolicy.js.
export function safeInternalPath(value, fallback = '/problems') {
  return toInternalPath(value) ?? fallback;
}

// BUG-081: keep the query string when sending a guest to /login.
export function loginUrlFor(pathname, search = '') {
  const target = safeInternalPath(`${pathname || ''}${search || ''}`, '');
  return target ? `/login?from=${encodeURIComponent(target)}` : '/login';
}

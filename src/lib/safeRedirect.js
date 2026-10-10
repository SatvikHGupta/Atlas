// Validates post-login return paths so ?from= can never leave the site. Author: Satvik Hemant Gupta

import { toInternalPath } from './urlPolicy.js';

// / accept only same-site paths such as "/problems?tab=cp"
export function safeInternalPath(value, fallback = '/problems') {
  return toInternalPath(value) ?? fallback;
}

// keep the query string when sending a guest to /login
export function loginUrlFor(pathname, search = '') {
  const target = safeInternalPath(`${pathname || ''}${search || ''}`, '');
  return target ? `/login?from=${encodeURIComponent(target)}` : '/login';
}

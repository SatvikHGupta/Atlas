'use client';

// Shared "must be signed in" gate for useProgress and useBookmarks.
// Author: Satvik Hemant Gupta

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, whenAuthReady } from '../store/auth.store.js';
import { loginUrlFor } from '../lib/safeRedirect.js';

// BUG-081: if Firebase has not answered yet, WAIT before deciding the user is
// a guest. Returns true when signed in. Otherwise sends the guest to /login
// with the full path + query encoded, and returns false.
export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();

  return async function requireAuth() {
    if (useAuthStore.getState().user) return true;
    await whenAuthReady();
    if (useAuthStore.getState().user) return true;
    router.push(loginUrlFor(pathname, window.location.search));
    return false;
  };
}

// Pure href logic for homepage CTAs. Author: Satvik Hemant Gupta
// BUG-083/084: public destinations link straight through. Only destinations
// that need user state send signed-out users to login, keeping the way back.

export function getCtaHref({ to, requiresAuth = false, isAuthed, authReady }) {
  if (!requiresAuth) return to;
  if (authReady === false) return to; // auth unresolved: do not guess
  if (isAuthed) return to;
  return `/login?from=${encodeURIComponent(to)}`;
}

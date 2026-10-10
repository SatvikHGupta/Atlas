// Pure href logic for homepage CTAs. Author: Satvik Hemant Gupta

export function getCtaHref({ to, requiresAuth = false, isAuthed, authReady }) {
  if (!requiresAuth) return to;
  if (authReady === false) return to;
  if (isAuthed) return to;
  return `/login?from=${encodeURIComponent(to)}`;
}

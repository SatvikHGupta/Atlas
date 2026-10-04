// Decides if a sign-in is recent enough for account deletion.
// Author: Satvik Hemant Gupta

// Firebase rejects deleteUser with auth/requires-recent-login when the last
// sign-in is older than about 5 minutes. Use a shorter window so we re-auth
// BEFORE deleting any data, not after. Unknown or bad input counts as old.
export const RECENT_LOGIN_MS = 4 * 60 * 1000;

export function isRecentSignIn(lastSignInTime, now = Date.now()) {
  const at = new Date(lastSignInTime).getTime();
  if (!lastSignInTime || Number.isNaN(at)) return false;
  return now - at >= 0 && now - at <= RECENT_LOGIN_MS;
}

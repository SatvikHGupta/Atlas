// Small pure auth helpers for filters and CTAs. Author: Satvik Hemant Gupta

// Contract authReady is false until the first Firebase resolution
export function isAuthResolved(state) {
  if (!state) return false;
  if (typeof state.authReady === 'boolean') return state.authReady;
  return state.loading !== true;
}

export const PERSONAL_STATUSES = ['solved', 'attempted', 'unsolved', 'bookmarked'];

// a signed-out user must not keep a personal status filter
export function shouldClearStatus({ status, isAuthed, resolved }) {
  return Boolean(status) && resolved && !isAuthed;
}

// Which personal data the status filter needs before the list is trustworthy
export function statusNeeds(status) {
  return {
    progress: status === 'solved' || status === 'attempted' || status === 'unsolved',
    bookmarks: status === 'bookmarked',
  };
}

// Tiny per-key debouncer whose memory stays bounded. Author: Satvik Hemant Gupta

// BUG-072: old entries are pruned whenever a new key is inserted, so the map
// cannot grow for the lifetime of the page.
export function createDebouncer({ windowMs = 500, now = Date.now } = {}) {
  const lastAt = new Map();
  const pruneAfterMs = windowMs * 5;

  function prune(time) {
    for (const [key, at] of lastAt) {
      if (time - at > pruneAfterMs) lastAt.delete(key);
    }
  }

  // true means "ignore this action, it repeated too fast"
  function isDebounced(key) {
    const time = now();
    const last = lastAt.get(key);
    if (last !== undefined && time - last < windowMs) return true;
    if (last === undefined) prune(time);
    lastAt.set(key, time);
    return false;
  }

  return { isDebounced, size: () => lastAt.size };
}

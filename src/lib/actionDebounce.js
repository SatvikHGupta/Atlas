// Tiny per-key debouncer whose memory stays bounded. Author: Satvik Hemant Gupta

export function createDebouncer({ windowMs = 500, now = Date.now } = {}) {
  const lastAt = new Map();
  const pruneAfterMs = windowMs * 5;

  function prune(time) {
    for (const [key, at] of lastAt) {
      if (time - at > pruneAfterMs) lastAt.delete(key);
    }
  }

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

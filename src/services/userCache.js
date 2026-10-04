// Versioned, uid-scoped, write-behind localStorage cache for user data.
// Author: Satvik Hemant Gupta

import { expandItemsMap, slimItemsMap } from '../lib/progressEntry.js';

// BUG-071/190: payload is { v, uid, items, cachedAt }. Anything else is a miss.
export const CACHE_VERSION = 2;
export const CACHE_STALE_MS = 5 * 60 * 1000; // same as the TanStack staleTime
export const WRITE_BEHIND_MS = 250;

export const cacheKey = (kind, uid) => `atlas_${kind}_cache_${uid}`;
// v1 blobs were never cleaned up and can be megabytes, so drop them too
const legacyKey = (kind, uid) => `atlas_${kind}_cache_v1_${uid}`;

// cachedAt of the blob already in storage for this user, or null. Used so a LOCAL write never re-stamps freshness.
function existingCachedAt(storage, key, uid) {
  try {
    const parsed = JSON.parse(storage.getItem(key));
    return parsed && parsed.v === CACHE_VERSION && parsed.uid === uid && typeof parsed.cachedAt === 'number'
      ? parsed.cachedAt
      : null;
  } catch {
    return null;
  }
}

function safeRemove(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    // nothing useful to do if storage itself is broken
  }
}

// Returns the expanded items map, or null on any miss. A cache written for
// another uid or another schema version is removed, never trusted.
export function readCacheFrom(storage, kind, uid, now = Date.now()) {
  if (!storage || !uid) return null;
  const key = cacheKey(kind, uid);
  try {
    const text = storage.getItem(key);
    if (text == null) {
      safeRemove(storage, legacyKey(kind, uid));
      return null;
    }
    const parsed = JSON.parse(text);
    const valid = parsed
      && parsed.v === CACHE_VERSION
      && parsed.uid === uid
      && typeof parsed.cachedAt === 'number'
      && parsed.items && typeof parsed.items === 'object';
    if (!valid || now - parsed.cachedAt > CACHE_STALE_MS) {
      safeRemove(storage, key);
      return null;
    }
    return expandItemsMap(parsed.items, kind);
  } catch {
    safeRemove(storage, key);
    return null;
  }
}

// BUG-070: updates are coalesced into one JSON.stringify + setItem per
// WRITE_BEHIND_MS instead of one per click. Callers also call flushNow() on
// visibilitychange (hidden) and pagehide. Storage is passed as a getter so
// this stays safe during SSR and when localStorage throws (private mode).
export function createCacheWriter({
  getStorage,
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  delayMs = WRITE_BEHIND_MS,
} = {}) {
  const dirty = new Map(); // "kind|uid" -> { kind, uid, items, fetchedAt }
  let timer = null;

  function storage() {
    try {
      return getStorage ? getStorage() : null;
    } catch {
      return null;
    }
  }

  function flushNow() {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
    const target = storage();
    const jobs = [...dirty.values()];
    dirty.clear();
    if (!target) return;
    for (const { kind, uid, items, fetchedAt } of jobs) {
      const key = cacheKey(kind, uid);
      try {
        // BUG-04: cachedAt means "when the SERVER last confirmed this data". A local write keeps the old stamp,
        // otherwise an active user would keep a stale cache alive forever and never see other-device changes.
        const cachedAt = fetchedAt ?? existingCachedAt(target, key, uid) ?? now();
        const payload = { v: CACHE_VERSION, uid, items: slimItemsMap(items), cachedAt };
        target.setItem(key, JSON.stringify(payload));
      } catch {
        // QuotaExceededError or storage disabled: drop the cache, never
        // crash. The next load simply re-reads from Firestore.
        safeRemove(target, key);
      }
    }
  }

  // fromServer: true only when `items` was just read from Firestore (freshness restarts); local edits omit it.
  function schedule(kind, uid, items, { fromServer = false } = {}) {
    if (!uid) return;
    const id = `${kind}|${uid}`;
    const fetchedAt = fromServer ? now() : dirty.get(id)?.fetchedAt;
    dirty.set(id, { kind, uid, items, fetchedAt });
    if (timer === null) timer = setTimer(flushNow, delayMs);
  }

  // sign-out, user switch, reset-all: forget pending writes AND the stored copy
  function discard(kind, uid) {
    if (!uid) return;
    dirty.delete(`${kind}|${uid}`);
    const target = storage();
    if (!target) return;
    safeRemove(target, cacheKey(kind, uid));
    safeRemove(target, legacyKey(kind, uid));
  }

  return { schedule, flushNow, discard, pendingCount: () => dirty.size };
}

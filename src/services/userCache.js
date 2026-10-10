// Versioned, uid-scoped, write-behind localStorage cache for user data. Author: Satvik Hemant Gupta

import { expandItemsMap, slimItemsMap } from '../lib/progressEntry.js';

export const CACHE_VERSION = 2;
export const CACHE_STALE_MS = 5 * 60 * 1000;
export const WRITE_BEHIND_MS = 250;

export const cacheKey = (kind, uid) => `atlas_${kind}_cache_${uid}`;
// v1 blobs were never cleaned up and can be megabytes, so drop them too
const legacyKey = (kind, uid) => `atlas_${kind}_cache_v1_${uid}`;

// cachedAt of the blob already in storage for this user, or null
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
  }
}

// Returns the expanded items map, or null on any miss
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

// updates are coalesced into one JSON.stringify + setItem per WRITE_BEHIND_MS
export function createCacheWriter({
  getStorage,
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  delayMs = WRITE_BEHIND_MS,
} = {}) {
  const dirty = new Map();
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
        const cachedAt = fetchedAt ?? existingCachedAt(target, key, uid) ?? now();
        const payload = { v: CACHE_VERSION, uid, items: slimItemsMap(items), cachedAt };
        target.setItem(key, JSON.stringify(payload));
      } catch {
        safeRemove(target, key);
      }
    }
  }

  function schedule(kind, uid, items, { fromServer = false } = {}) {
    if (!uid) return;
    const id = `${kind}|${uid}`;
    const fetchedAt = fromServer ? now() : dirty.get(id)?.fetchedAt;
    dirty.set(id, { kind, uid, items, fetchedAt });
    if (timer === null) timer = setTimer(flushNow, delayMs);
  }

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

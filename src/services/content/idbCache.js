/**
 * Thin IndexedDB wrapper used by dataClient.js to cache large static JSON
 * payloads (problems.json / oc.json / notes) across sessions.
 *
 * Design constraints (see docs/03-DATA-LAYER.md):
 * - Never throws out to the caller. Any IndexedDB failure (unavailable,
 *   quota exceeded, private browsing restrictions) is swallowed here and
 *   surfaced as `isAvailable() === false` / a no-op set / an undefined get.
 *   dataClient.js then transparently falls back to memory-only caching.
 * - No external dependency (no idb-keyval) - the surface area we need is
 *   small enough that a raw wrapper is easier to reason about and audit.
 */

const DB_NAME = 'atlas-content-cache';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

let dbPromise = null;
let available = null; // null = unknown yet, true/false once determined

function openDb() {
  if (typeof indexedDB === 'undefined') {
    available = false;
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        req.onsuccess = () => {
          available = true;
          resolve(req.result);
        };

        req.onerror = () => {
          console.warn('[idbCache] failed to open IndexedDB, falling back to memory-only', req.error);
          available = false;
          resolve(null);
        };
      } catch (err) {
        // Some browsers (older Safari private mode) throw synchronously.
        console.warn('[idbCache] IndexedDB unavailable, falling back to memory-only', err);
        available = false;
        resolve(null);
      }
    });
  }

  return dbPromise;
}

export const idbCache = {
  /** True once we know IndexedDB is usable in this browser/session. */
  async isAvailable() {
    if (available === null) await openDb();
    return available === true;
  },

  /** Returns the cached value for `key`, or undefined if missing/unavailable. */
  async get(key) {
    const db = await openDb();
    if (!db) return undefined;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('[idbCache] get failed for', key, req.error);
          resolve(undefined);
        };
      } catch (err) {
        console.warn('[idbCache] get threw for', key, err);
        resolve(undefined);
      }
    });
  },

  /**
   * Stores `value` under `key`. Never rejects - a quota error or any other
   * write failure is logged and swallowed, matching the "graceful
   * degradation" requirement in docs/03-DATA-LAYER.md.
   */
  async set(key, value) {
    const db = await openDb();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => {
          console.warn('[idbCache] set failed for', key, '(likely quota exceeded)', tx.error);
          resolve(false);
        };
      } catch (err) {
        console.warn('[idbCache] set threw for', key, err);
        resolve(false);
      }
    });
  },

  async clear() {
    const db = await openDb();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  },
};

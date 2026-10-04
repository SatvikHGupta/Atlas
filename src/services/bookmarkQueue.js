// Coalescing, serial-per-user bookmark write queue with rollback reporting.
// Author: Satvik Hemant Gupta

import { slimEntry } from '../lib/progressEntry.js';

// ATLAS-BUG-004: `previous` value meaning "we never learned what the server holds for this id". Only produced when the
// queue had no confirmed baseline and could not fetch one. The handler must re-read from the server, not roll back.
export const UNKNOWN_BASELINE = Symbol('unknown-baseline');

// ATLAS-BUG-014: equality over the FULL persisted entry (id + bookmarked_at), not just membership.
const sameEntry = (a, b) => JSON.stringify(slimEntry(a)) === JSON.stringify(slimEntry(b));

/* How it works. A click records the DESIRED end state for one id (an entry, or
   null for "not bookmarked") and (re)starts a quiet-period timer. Only when
   the queue has been quiet for delayMs (or maxWaitMs has passed since the
   first queued change) does it write, and everything queued goes out in ONE
   write call.

   BUG-047: the old comment claimed add-then-remove "costs nothing". It only
   collapsed inside one window and still sent a delete. Now a flush compares
   each id's final intent with `persisted` (what Firestore is known to hold,
   set at load and after every successful flush) and skips ids that already
   match. Toggle on then off, or off then on, inside a window writes nothing.

   BUG-045: flushes are chained per user. A flush snapshots the pending map at
   the moment it STARTS, awaits the write, and only then can the next flush
   start. Changes made while a write is in flight stay pending for the next.

   BUG-043/046: no per-call callbacks. One handler set (setHandlers) receives
   every result. On failure it gets `previous` (id -> persisted entry or null)
   for the ids that were NOT changed again since, so the store and cache can
   be rolled back to what the server really has.

   ATLAS-BUG-004: two separate concepts. A cached snapshot is only what the UI last showed (may be stale), it is NEVER a
   rollback authority. `persisted` / `loaded` mean "confirmed by the server". If the first write happens while only a
   cache exists, the queue fetches the server baseline first (loadBaseline, one read, only when the user actually writes).
   If that fetch fails, nothing is written and the handler is told the baseline is UNKNOWN so it re-reads the server.

   ATLAS-BUG-014: net-zero is decided on the full entry. Remove then re-add inside one window is NOT a no-op for a
   persisted bookmark, because the re-add carries a fresh bookmarked_at that has to be saved (and ordering follows it).

   Trade-off, unchanged: between click and flush the change exists only in
   memory. A hard tab kill inside that window loses the last click. */
export function createBookmarkQueue({
  write, // async (uid, Map(id -> entry|null)) => void, throws on failure
  loadBaseline = null, // async (uid) => {id: entry} the server copy; used when only a cache exists (BUG-004)
  delayMs = 1200,
  maxWaitMs = 3000,
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  const users = new Map(); // uid -> per-user state
  let handlers = { onFailure: null, onSuccess: null };

  function stateFor(uid) {
    let u = users.get(uid);
    if (!u) {
      u = {
        pending: new Map(),
        persisted: new Map(),
        loaded: false,
        timer: null,
        firstQueuedAt: 0,
        chain: Promise.resolve(),
      };
      users.set(uid, u);
    }
    return u;
  }

  function schedule(uid) {
    const u = users.get(uid);
    if (!u || u.pending.size === 0) return;
    if (u.timer !== null) clearTimer(u.timer);
    const waited = now() - u.firstQueuedAt;
    const delay = Math.min(delayMs, Math.max(0, maxWaitMs - waited));
    u.timer = setTimer(() => {
      u.timer = null;
      flush(uid);
    }, delay);
  }

  async function runFlush(uid, u) {
    if (users.get(uid) !== u) return { ok: true, stale: true, written: 0 };
    if (u.pending.size === 0) return { ok: true, written: 0 };

    const snapshot = u.pending;
    u.pending = new Map();

    // ATLAS-BUG-004: no confirmed baseline yet (cache-first start). Establish one BEFORE deciding or writing anything.
    if (!u.loaded && loadBaseline) {
      try {
        const items = await loadBaseline(uid);
        if (users.get(uid) !== u) return { ok: true, stale: true, written: 0 };
        u.persisted = new Map(Object.entries(items || {}));
        u.loaded = true;
      } catch (error) {
        if (users.get(uid) !== u) return { ok: false, stale: true, error };
        const previous = new Map();
        for (const id of snapshot.keys()) if (!u.pending.has(id)) previous.set(id, UNKNOWN_BASELINE);
        if (handlers.onFailure) handlers.onFailure({ uid, previous, error });
        return { ok: false, error };
      }
    }

    const changes = new Map();
    for (const [id, entry] of snapshot) {
      // net-zero: intent already equals what the server holds (same membership AND same entry, BUG-014)
      if (u.loaded) {
        const held = u.persisted.get(id);
        if (entry === null ? held === undefined : (held !== undefined && sameEntry(held, entry))) continue;
      }
      changes.set(id, entry);
    }
    if (changes.size === 0) return { ok: true, written: 0 };

    let result;
    try {
      await write(uid, changes);
    } catch (error) {
      if (users.get(uid) !== u) return { ok: false, stale: true, error };
      const previous = new Map();
      for (const id of changes.keys()) {
        if (u.pending.has(id)) continue; // changed again since, newer intent wins
        previous.set(id, u.persisted.get(id) ?? null);
      }
      if (handlers.onFailure) handlers.onFailure({ uid, previous, error });
      result = { ok: false, error };
    }

    if (!result) {
      if (users.get(uid) !== u) return { ok: true, stale: true, written: changes.size };
      for (const [id, entry] of changes) {
        if (entry === null) u.persisted.delete(id);
        else u.persisted.set(id, entry);
      }
      if (handlers.onSuccess) handlers.onSuccess({ uid, written: changes.size });
      result = { ok: true, written: changes.size };
    }

    if (users.get(uid) === u && u.pending.size > 0) schedule(uid);
    return result;
  }

  // Resolves with the outcome of the flush that covers everything queued so
  // far. Never rejects: failures go to handlers.onFailure.
  function flush(uid) {
    const u = users.get(uid);
    if (!u) return Promise.resolve({ ok: true, written: 0 });
    if (u.timer !== null) {
      clearTimer(u.timer);
      u.timer = null;
    }
    const run = u.chain.then(() => runFlush(uid, u));
    u.chain = run;
    return run;
  }

  return {
    setHandlers(next) {
      handlers = { onFailure: null, onSuccess: null, ...next };
    },

    // what Firestore is known to hold, from a load (items: id -> entry)
    setPersisted(uid, items) {
      const u = stateFor(uid);
      u.persisted = new Map(Object.entries(items || {}));
      u.loaded = true;
    },

    enqueue(uid, id, entry) {
      const u = stateFor(uid);
      if (u.pending.size === 0) u.firstQueuedAt = now();
      u.pending.set(id, entry);
      schedule(uid);
    },

    flush,
    flushAll: () => Promise.all([...users.keys()].map(flush)),
    hasPending: (uid) => (users.get(uid)?.pending.size || 0) > 0,

    // sign-out or user switch: drop pending changes and any timer, and make
    // in-flight results for this user stale so they are ignored
    discard(uid) {
      const u = users.get(uid);
      if (!u) return;
      if (u.timer !== null) clearTimer(u.timer);
      users.delete(uid);
    },
  };
}

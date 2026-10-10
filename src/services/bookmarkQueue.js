// Coalescing, serial-per-user bookmark write queue with rollback reporting. Author: Satvik Hemant Gupta

import { slimEntry } from '../lib/progressEntry.js';

export const UNKNOWN_BASELINE = Symbol('unknown-baseline');

// equality over the FULL persisted entry
const sameEntry = (a, b) => JSON.stringify(slimEntry(a)) === JSON.stringify(slimEntry(b));

// How it works
export function createBookmarkQueue({
  write,
  loadBaseline = null,
  delayMs = 1200,
  maxWaitMs = 3000,
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  const users = new Map();
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
        if (u.pending.has(id)) continue;
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

    discard(uid) {
      const u = users.get(uid);
      if (!u) return;
      if (u.timer !== null) clearTimer(u.timer);
      users.delete(uid);
    },
  };
}

'use client';

import { create } from 'zustand';
import {
  watchAuthState, signInWithGoogle, signOutUser, consumeRedirectResult, clearFirestoreLocalData,
} from '../services/firebase.js';
import {
  fetchProgress, fetchBookmarks, syncUserProfile, flushAllBookmarksNow,
  isQuotaExhausted, bookmarkQueue, progressQueue,
} from '../services/firestore.js';
import { createCacheWriter, readCacheFrom } from '../services/userCache.js';
import { UNKNOWN_BASELINE } from '../services/bookmarkQueue.js';
import { deletionMarker } from '../lib/accountDeletion.js';
import { useUIStore } from './ui.store.js';
import { shouldApply } from '../lib/sessionGuard.js';
import {
  estimateItemsBytes, estimateEntryBytes, capacityLevel, LIMIT_BYTES,
} from '../lib/progressEntry.js';

/* COST FIX (read-quota pass): progress/bookmarks used to be onSnapshot listeners, which re-bill a read every
   time the user's own write changes the doc (see firestore.js comment). Now it's a one-time getDoc per
   session, cached in localStorage for CACHE_STALE_MS so a refresh/new-tab within that window costs 0 reads,
   and every local write updates both the store and the cache directly (optimistic - no round trip needed to
   know our own new state). Trade-off: a second open tab, or a write from another device, won't be reflected
   here until the cache goes stale or the page reloads - acceptable for a solo-use progress tracker, and a
   real reload always gets fresh-enough data via the cache TTL anyway. */

/* SESSION GUARD (BUG-055/056/057/176): every async continuation captures { uid, session } when it starts and re-checks it with shouldApply() before touching the store, a cache, a degraded flag or a toast. authSession bumps on every sign-in, sign-out and user switch, so a slow fetch for user A can never land on user B. The four item setters also take the initiating uid as first argument and do nothing if it is not the current user. */

const RETRY_DELAYS_MS = [1000, 3000]; // BUG-064: two automatic retries, then wait for `online` or retry()
const KINDS = {
  progress: {
    items: 'progressItems', ready: 'progressReady', failed: 'progressLoadFailed',
    capacity: 'progressCapacity', fetch: fetchProgress,
    loadToast: 'Could not load your progress - showing problems without it',
    warnToast: 'You are close to the progress tracking limit for one account.',
  },
  bookmarks: {
    items: 'bookmarkItems', ready: 'bookmarksReady', failed: 'bookmarksLoadFailed',
    capacity: 'bookmarksCapacity', fetch: fetchBookmarks,
    loadToast: 'Could not load your bookmarks',
    warnToast: 'You are close to the bookmark limit for one account.',
  },
};

function getStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // some browsers throw just for touching localStorage
  }
}

// BUG-070: write-behind. One stringify + setItem per ~250 ms, not per click.
const cacheWriter = createCacheWriter({ getStorage });

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => cacheWriter.flushNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') cacheWriter.flushNow();
  });
}

const emptyCapacity = () => ({ usedBytes: 0, limitBytes: LIMIT_BYTES });

// firestoreDegraded stays a boolean for existing consumers: true if either resource is degraded
const degradedFlags = (d) => ({
  degraded: d,
  progressDegraded: d.progress,
  bookmarksDegraded: d.bookmarks,
  firestoreDegraded: d.progress || d.bookmarks,
});

// everything that belongs to ONE signed-in user
const emptyUserState = () => ({
  progressItems: {},
  bookmarkItems: {},
  progressReady: false,
  bookmarksReady: false,
  progressLoadFailed: false,
  bookmarksLoadFailed: false,
  progressCapacity: emptyCapacity(),
  bookmarksCapacity: emptyCapacity(),
  accountBusy: false,
  ...degradedFlags({ progress: false, bookmarks: false }),
});

function adjustCapacity(capacity, id, prevEntry, nextEntry) {
  const before = prevEntry ? estimateEntryBytes(id, prevEntry) : 0;
  const after = nextEntry ? estimateEntryBytes(id, nextEntry) : 0;
  return { ...capacity, usedBytes: Math.max(0, capacity.usedBytes - before + after) };
}

export const useAuthStore = create((set, get) => {
  const waits = new Set(); // pending retry back-offs, cancelled on session end
  const warned = { progress: false, bookmarks: false };

  const alive = (ctx) => shouldApply(get(), ctx);

  function wait(ms) {
    return new Promise((resolve) => {
      const entry = { resolve };
      entry.id = setTimeout(() => { waits.delete(entry); resolve(); }, ms);
      waits.add(entry);
    });
  }

  function cancelWaits() {
    for (const entry of waits) { clearTimeout(entry.id); entry.resolve(); }
    waits.clear();
  }

  function setDegraded(kind, value) {
    const d = { ...get().degraded, [kind]: value };
    set(degradedFlags(d));
  }

  // one warning per session per resource when usage crosses the warn level
  function noteCapacity(kind) {
    const k = KINDS[kind];
    if (warned[kind] || capacityLevel(get()[k.capacity].usedBytes) === 'ok') return;
    warned[kind] = true;
    useUIStore.getState().addToast(k.warnToast, 'info');
  }

  // tears down everything tied to a user that is going away (BUG-055, 062)
  function endUserSession(uid) {
    if (!uid) return;
    cancelWaits();
    warned.progress = false;
    warned.bookmarks = false;
    bookmarkQueue.discard(uid);
    cacheWriter.discard('progress', uid);
    cacheWriter.discard('bookmarks', uid);
  }

  function applyLoaded(kind, ctx, items, fromCache) {
    if (!alive(ctx)) return;
    const k = KINDS[kind];
    set({
      [k.items]: items,
      [k.ready]: true,
      [k.failed]: false,
      [k.capacity]: { usedBytes: estimateItemsBytes(items), limitBytes: LIMIT_BYTES },
    });
    // BUG-05: only a server read says what is really persisted. A (possibly stale) cache must not feed the
    // "net-zero" skip in the bookmark queue, otherwise removing a bookmark the cache never knew about is dropped.
    if (kind === 'bookmarks' && !fromCache) bookmarkQueue.setPersisted(ctx.uid, items);
    if (!fromCache) {
      cacheWriter.schedule(kind, ctx.uid, items, { fromServer: true });
      setDegraded(kind, false); // only THIS resource's flag (BUG-062/063)
    }
    noteCapacity(kind);
  }

  function failLoad(kind, ctx, err) {
    if (!alive(ctx)) return;
    const k = KINDS[kind];
    console.error(`[auth] load ${kind} failed:`, err?.message);
    set({ [k.failed]: true, [k.ready]: false });
    if (isQuotaExhausted(err)) setDegraded(kind, true);
    useUIStore.getState().addToast(k.loadToast, 'error');
  }

  // BUG-064: a failed load is NOT "ready with empty data". Two automatic
  // retries with back-off, then it waits for the `online` event or retry().
  async function loadResource(kind, ctx, { allowCache = true } = {}) {
    const k = KINDS[kind];
    if (allowCache) {
      const cached = readCacheFrom(getStorage(), kind, ctx.uid);
      if (cached) { applyLoaded(kind, ctx, cached, true); return; }
    }
    for (let attempt = 0; ; attempt += 1) {
      try {
        const items = await k.fetch(ctx.uid);
        applyLoaded(kind, ctx, items, false);
        return;
      } catch (err) {
        if (!alive(ctx)) return;
        const canRetry = attempt < RETRY_DELAYS_MS.length && !isQuotaExhausted(err);
        if (!canRetry) { failLoad(kind, ctx, err); return; }
        await wait(RETRY_DELAYS_MS[attempt]);
        if (!alive(ctx)) return;
      }
    }
  }

  return {
    user: null,
    loading: true,
    // C4: false until the first Firebase auth resolution. Consumers must treat undefined as ready (s.authReady !== false).
    authReady: false,
    // C4: bumps on every sign-in, sign-out and user switch
    authSession: 0,
    authError: null, // set when a redirect sign-in comes back with an error (BUG-079)
    ...emptyUserState(),
    // QUOTA GUARD: set true the moment a Firestore call for that resource fails with 'resource-exhausted' (the daily read/write cap is actually hit - see firestore.js isQuotaExhausted()). UI reads this to disable write-triggering buttons so people aren't clicking into calls that will just fail - sign-in/out stays enabled since Firebase Auth isn't part of this quota at all. Cleared on the next SUCCESSFUL call for THAT resource (BUG-062/063), not on a timer - correctness over guessing when the Pacific-midnight reset actually landed.
    setDegraded,
    // kept for existing callers: sets both resources
    setAccountBusy: (busy) => set({ accountBusy: busy }),
    clearAuthError: () => set({ authError: null }),

    init: () => {
      consumeRedirectResult().catch((err) => {
        console.warn('[auth] consumeRedirectResult failed:', err.message);
        if (err?.code && err.code !== 'auth/popup-closed-by-user') {
          set({ authError: { code: err.code } });
        }
      });

      const unsub = watchAuthState(async (firebaseUser) => {
        const prev = get().user;

        if (!firebaseUser) {
          if (prev) endUserSession(prev.uid);
          set({
            ...emptyUserState(), user: null, loading: false, authReady: true,
            authSession: get().authSession + 1,
          });
          return;
        }

        // same user announced again: nothing to reload
        if (prev && prev.uid === firebaseUser.uid) {
          set({ user: firebaseUser, loading: false, authReady: true });
          return;
        }

        if (prev) endUserSession(prev.uid); // user switch
        const session = get().authSession + 1;
        set({
          ...emptyUserState(), user: firebaseUser, loading: false, authReady: true,
          authSession: session, authError: null,
        });
        const ctx = { uid: firebaseUser.uid, session };

        loadResource('progress', ctx);
        loadResource('bookmarks', ctx);

        // ATLAS-BUG-013: an account whose deletion is pending must not get an empty profile re-created on sign-in
        if (deletionMarker.has(ctx.uid)) return;
        try {
          await syncUserProfile(
            ctx.uid, firebaseUser.displayName, firebaseUser.photoURL,
            firebaseUser.metadata?.creationTime,
          );
        } catch (err) {
          console.warn('[auth] syncUserProfile failed:', err.message);
        }
      });

      // BUG-064: coming back online retries anything that failed to load
      const onOnline = () => get().retryLoads();
      if (typeof window !== 'undefined') window.addEventListener('online', onOnline);

      return () => {
        unsub();
        if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
      };
    },

    // manual / online retry for loads that gave up (contract C2 retry())
    retryLoads: () => {
      const state = get();
      if (!state.user) return;
      const ctx = { uid: state.user.uid, session: state.authSession };
      for (const kind of Object.keys(KINDS)) {
        const k = KINDS[kind];
        if (!state[k.failed]) continue;
        set({ [k.failed]: false }); // shows the loading state again, blocks duplicate retries
        loadResource(kind, ctx, { allowCache: false });
      }
    },

    // ATLAS-BUG-004: local state can no longer be trusted (a write failed and the server baseline is unknown), so drop
    // it and re-read from the SERVER, bypassing the cache. The loading state shows until the read lands.
    reloadFromServer: (kind) => {
      const state = get();
      const k = KINDS[kind];
      if (!state.user || !k) return;
      const ctx = { uid: state.user.uid, session: state.authSession };
      set({ [k.ready]: false, [k.failed]: false });
      loadResource(kind, ctx, { allowCache: false });
    },

    // optimistic local update after a successful progress write - no extra read needed, we already know the value
    setProgressItem: (uid, canonicalId, entry) => {
      const { user, progressItems, progressCapacity } = get();
      if (!user || user.uid !== uid) return;
      const items = { ...progressItems, [canonicalId]: entry };
      set({
        progressItems: items,
        progressCapacity: adjustCapacity(progressCapacity, canonicalId, progressItems[canonicalId], entry),
      });
      cacheWriter.schedule('progress', uid, items);
      noteCapacity('progress');
    },
    removeProgressItem: (uid, canonicalId) => {
      const { user, progressItems, progressCapacity } = get();
      if (!user || user.uid !== uid) return;
      const items = { ...progressItems };
      delete items[canonicalId];
      set({
        progressItems: items,
        progressCapacity: adjustCapacity(progressCapacity, canonicalId, progressItems[canonicalId], null),
      });
      cacheWriter.schedule('progress', uid, items);
    },
    setBookmarkItem: (uid, canonicalId, entry) => {
      const { user, bookmarkItems, bookmarksCapacity } = get();
      if (!user || user.uid !== uid) return;
      const items = { ...bookmarkItems, [canonicalId]: entry };
      set({
        bookmarkItems: items,
        bookmarksCapacity: adjustCapacity(bookmarksCapacity, canonicalId, bookmarkItems[canonicalId], entry),
      });
      cacheWriter.schedule('bookmarks', uid, items);
      noteCapacity('bookmarks');
    },
    removeBookmarkItem: (uid, canonicalId) => {
      const { user, bookmarkItems, bookmarksCapacity } = get();
      if (!user || user.uid !== uid) return;
      const items = { ...bookmarkItems };
      delete items[canonicalId];
      set({
        bookmarkItems: items,
        bookmarksCapacity: adjustCapacity(bookmarksCapacity, canonicalId, bookmarkItems[canonicalId], null),
      });
      cacheWriter.schedule('bookmarks', uid, items);
    },

    // BUG-043: a failed bookmark flush puts the store AND cache back to what Firestore really holds. `previous` is Map(id -> persisted entry | null).
    rollbackBookmarks: (uid, previous) => {
      const { user, bookmarkItems } = get();
      if (!user || user.uid !== uid) return;
      const items = { ...bookmarkItems };
      for (const [id, entry] of previous) {
        if (entry) items[id] = entry;
        else delete items[id];
      }
      set({
        bookmarkItems: items,
        bookmarksCapacity: { usedBytes: estimateItemsBytes(items), limitBytes: LIMIT_BYTES },
      });
      cacheWriter.schedule('bookmarks', uid, items);
    },

    // BUG-051/052/053: reset-all clears the store and the cache, so nothing stale is left to compute from
    clearProgress: (uid) => {
      const { user } = get();
      if (!user || user.uid !== uid) return;
      set({ progressItems: {}, progressCapacity: emptyCapacity() });
      cacheWriter.discard('progress', uid);
      warned.progress = false;
    },

    // BUG-075: wipe every local trace of this user's data (used by account deletion)
    clearAllLocalUserData: (uid) => {
      const { user } = get();
      if (!user || user.uid !== uid) return;
      endUserSession(uid);
      set({
        ...emptyUserState(), accountBusy: get().accountBusy,
      });
    },

    // BUG-079: never throws, so click handlers cannot blow up. Returns { ok, error?, redirected? }.
    signInWithGoogle: async () => {
      set({ authError: null });
      try {
        return await signInWithGoogle();
      } catch (err) {
        return { ok: false, error: { code: err?.code || 'unknown', message: err?.message || '' } };
      }
    },

    // same cleanup as a real sign-out, without calling Firebase (account deletion ends the session by itself)
    signOutLocal: (uid) => {
      if (get().user?.uid !== uid) return;
      endUserSession(uid);
      set({ ...emptyUserState(), user: null, authSession: get().authSession + 1 });
    },

    signOut: async () => {
      const uid = get().user?.uid;
      if (uid) {
        await flushAllBookmarksNow(); // land any still-queued bookmark write before the auth token is revoked
        await progressQueue.whenIdle(uid); // and any progress write already in flight
      }
      await signOutUser();
      if (uid) get().signOutLocal(uid);
      await clearFirestoreLocalData(); // SEC-11: no copy of the account's docs left on this device
    },
  };
});

// BUG-081: protected actions must not decide "logged out" before Firebase has answered. Resolves true as soon as auth is ready, false if it never resolves within timeoutMs. Tolerates authReady === undefined (treated as ready).
export function whenAuthReady(timeoutMs = 8000) {
  if (useAuthStore.getState().authReady !== false) return Promise.resolve(true);
  return new Promise((resolve) => {
    let timer = null;
    let unsubscribe = () => {};
    const finish = (value) => {
      unsubscribe();
      clearTimeout(timer);
      resolve(value);
    };
    unsubscribe = useAuthStore.subscribe((s) => {
      if (s.authReady !== false) finish(true);
    });
    timer = setTimeout(() => finish(false), timeoutMs);
  });
}

// BUG-043/044/046 + BUG-25: ONE handler set for the whole app. It lives here (not in a hook module) so it is
// registered as soon as the store exists, even if a bookmark flush fires before any component imported useBookmarks.
const LIMITED_MSG = 'Service temporarily limited - resets at midnight PT';
bookmarkQueue.setHandlers({
  onFailure: ({ uid, previous, error }) => {
    const store = useAuthStore.getState();
    if (store.user?.uid !== uid) return; // user changed while the write was in flight
    // ATLAS-BUG-004: ids whose server state we never learned cannot be rolled back, only re-read
    const known = new Map([...previous].filter(([, v]) => v !== UNKNOWN_BASELINE));
    if (known.size !== previous.size) store.reloadFromServer('bookmarks');
    if (known.size > 0) store.rollbackBookmarks(uid, known); // star goes back to what the server has
    console.error('[auth] bookmark flush failed', error);
    if (isQuotaExhausted(error)) {
      store.setDegraded('bookmarks', true);
      useUIStore.getState().addToast(LIMITED_MSG, 'error');
    } else {
      useUIStore.getState().addToast('Failed to save bookmark change', 'error');
    }
  },
  onSuccess: ({ uid }) => {
    const store = useAuthStore.getState();
    if (store.user?.uid !== uid) return;
    store.setDegraded('bookmarks', false); // this batch landed, bookmarks are not degraded anymore
  },
});

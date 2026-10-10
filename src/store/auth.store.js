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

const RETRY_DELAYS_MS = [1000, 3000];
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
    return null;
  }
}

const cacheWriter = createCacheWriter({ getStorage });

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => cacheWriter.flushNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') cacheWriter.flushNow();
  });
}

const emptyCapacity = () => ({ usedBytes: 0, limitBytes: LIMIT_BYTES });

// firestoreDegraded stays a boolean for existing consumers
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
  const waits = new Set();
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

  function noteCapacity(kind) {
    const k = KINDS[kind];
    if (warned[kind] || capacityLevel(get()[k.capacity].usedBytes) === 'ok') return;
    warned[kind] = true;
    useUIStore.getState().addToast(k.warnToast, 'info');
  }

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
    if (kind === 'bookmarks' && !fromCache) bookmarkQueue.setPersisted(ctx.uid, items);
    if (!fromCache) {
      cacheWriter.schedule(kind, ctx.uid, items, { fromServer: true });
      setDegraded(kind, false);
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
    authReady: false,
    authSession: 0,
    authError: null,
    ...emptyUserState(),
    setDegraded,
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

        if (prev && prev.uid === firebaseUser.uid) {
          set({ user: firebaseUser, loading: false, authReady: true });
          return;
        }

        if (prev) endUserSession(prev.uid);
        const session = get().authSession + 1;
        set({
          ...emptyUserState(), user: firebaseUser, loading: false, authReady: true,
          authSession: session, authError: null,
        });
        const ctx = { uid: firebaseUser.uid, session };

        loadResource('progress', ctx);
        loadResource('bookmarks', ctx);

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

      const onOnline = () => get().retryLoads();
      if (typeof window !== 'undefined') window.addEventListener('online', onOnline);

      return () => {
        unsub();
        if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
      };
    },

    retryLoads: () => {
      const state = get();
      if (!state.user) return;
      const ctx = { uid: state.user.uid, session: state.authSession };
      for (const kind of Object.keys(KINDS)) {
        const k = KINDS[kind];
        if (!state[k.failed]) continue;
        set({ [k.failed]: false });
        loadResource(kind, ctx, { allowCache: false });
      }
    },

    reloadFromServer: (kind) => {
      const state = get();
      const k = KINDS[kind];
      if (!state.user || !k) return;
      const ctx = { uid: state.user.uid, session: state.authSession };
      set({ [k.ready]: false, [k.failed]: false });
      loadResource(kind, ctx, { allowCache: false });
    },

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

    clearProgress: (uid) => {
      const { user } = get();
      if (!user || user.uid !== uid) return;
      set({ progressItems: {}, progressCapacity: emptyCapacity() });
      cacheWriter.discard('progress', uid);
      warned.progress = false;
    },

    clearAllLocalUserData: (uid) => {
      const { user } = get();
      if (!user || user.uid !== uid) return;
      endUserSession(uid);
      set({
        ...emptyUserState(), accountBusy: get().accountBusy,
      });
    },

    signInWithGoogle: async () => {
      set({ authError: null });
      try {
        return await signInWithGoogle();
      } catch (err) {
        return { ok: false, error: { code: err?.code || 'unknown', message: err?.message || '' } };
      }
    },

    signOutLocal: (uid) => {
      if (get().user?.uid !== uid) return;
      endUserSession(uid);
      set({ ...emptyUserState(), user: null, authSession: get().authSession + 1 });
    },

    signOut: async () => {
      const uid = get().user?.uid;
      if (uid) {
        await flushAllBookmarksNow();
        await progressQueue.whenIdle(uid);
      }
      await signOutUser();
      if (uid) get().signOutLocal(uid);
      await clearFirestoreLocalData();
    },
  };
});

// protected actions must not decide "logged out" before Firebase has answered
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

const LIMITED_MSG = 'Service temporarily limited - resets at midnight PT';
bookmarkQueue.setHandlers({
  onFailure: ({ uid, previous, error }) => {
    const store = useAuthStore.getState();
    if (store.user?.uid !== uid) return;
    const known = new Map([...previous].filter(([, v]) => v !== UNKNOWN_BASELINE));
    if (known.size !== previous.size) store.reloadFromServer('bookmarks');
    if (known.size > 0) store.rollbackBookmarks(uid, known);
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
    store.setDegraded('bookmarks', false);
  },
});

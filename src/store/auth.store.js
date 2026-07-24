import { create } from 'zustand';
import {
  onAuthStateChanged, firebaseAuth, signInWithGoogle, signOutUser, consumeRedirectResult,
} from '../services/firebase.js';
import { watchProgress, watchBookmarks, watchUser, syncUserProfile } from '../services/firestore.js';
import { useUIStore } from './ui.store.js';

// Listener unsubscribe functions live outside the store's state (they're
// not serializable/renderable data, just cleanup handles) - kept module-
// scoped so init()/sign-out can reach them without exposing them to consumers.
let unsubProgress = null;
let unsubBookmarks = null;
let unsubUser = null;

function detachListeners() {
  unsubProgress?.();
  unsubBookmarks?.();
  unsubUser?.();
  unsubProgress = null;
  unsubBookmarks = null;
  unsubUser = null;
}

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,

  // Live Firestore state - attached/detached alongside auth state.
  // Default to {} / null (not undefined) so consumers never need extra
  // guards while a listener is still attaching.
  progressItems: {},
  bookmarkItems: {},
  userDoc: null,
  progressReady: false,
  bookmarksReady: false,

  init: () => {
    // Pick up the result of a signInWithRedirect flow (mobile/in-app-browser
    // fallback, see services/firebase.js). Safe to call even if the user
    // arrived via a normal popup sign-in or isn't signing in at all.
    consumeRedirectResult().catch((err) => {
      console.warn('[auth] consumeRedirectResult failed:', err.message);
    });

    const unsub = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      const prevUser = get().user;
      detachListeners();

      if (!firebaseUser) {
        set({
          user: null,
          loading: false,
          progressItems: {},
          bookmarkItems: {},
          userDoc: null,
          progressReady: false,
          bookmarksReady: false,
        });
        return;
      }

      set({ user: firebaseUser, loading: false, progressReady: false, bookmarksReady: false });

      unsubProgress = watchProgress(
        firebaseUser.uid,
        (items) => set({ progressItems: items, progressReady: true }),
        (err) => {
          // A listener error (most commonly: firestore.rules not deployed,
          // so reads are denied by default) must still unblock isLoading -
          // otherwise every consumer of useProgress() (e.g. the DSA
          // Problems page, which gates its whole list on this) is stuck
          // "loading" forever instead of showing an error.
          console.error('[auth] progress listener failed:', err.message);
          set({ progressReady: true });
          useUIStore.getState().addToast('Could not load your progress - showing problems without it', 'error');
        }
      );
      unsubBookmarks = watchBookmarks(
        firebaseUser.uid,
        (items) => set({ bookmarkItems: items, bookmarksReady: true }),
        (err) => {
          console.error('[auth] bookmarks listener failed:', err.message);
          set({ bookmarksReady: true });
          useUIStore.getState().addToast('Could not load your bookmarks', 'error');
        }
      );
      unsubUser = watchUser(firebaseUser.uid, (userDoc) => set({ userDoc }));

      // Only sync profile on a fresh sign-in (not on every listener
      // re-attach/tab focus), same as the original backend's syncUser
      // trigger condition - plus the ~12h throttle in syncUserProfile
      // itself (docs/04, cost optimization #5).
      if (!prevUser) {
        try {
          await syncUserProfile(
            firebaseUser.uid,
            firebaseUser.displayName,
            firebaseUser.photoURL,
            get().userDoc
          );
        } catch (err) {
          console.warn('[auth] syncUserProfile failed:', err.message);
        }
      }
    });

    return () => { unsub(); detachListeners(); };
  },

  signInWithGoogle: async () => {
    await signInWithGoogle();
  },

  signOut: async () => {
    detachListeners();
    await signOutUser();
    set({ user: null, progressItems: {}, bookmarkItems: {}, userDoc: null });
  },
}));

'use client';

import { useMemo } from 'react';
import { useAuthStore } from '../store/auth.store.js';
import { useUIStore } from '../store/ui.store.js';
import { queueBookmarkWrite, isQuotaExhausted } from '../services/firestore.js';
import { createDebouncer } from '../lib/actionDebounce.js';
import { capacityLevel } from '../lib/progressEntry.js';
import { resourceState } from '../lib/resourceState.js';
import { isRetiredId } from '../constants/retiredProblems.js';
import { useRequireAuth } from './useRequireAuth.js';

const { isDebounced } = createDebouncer({ windowMs: 500 });
const LIMITED_MSG = 'Service temporarily limited - resets at midnight PT';

export const useBookmarks = () => {
  const isAuthenticatedNow = useAuthStore((s) => !!s.user);
  const bookmarkItems = useAuthStore((s) => s.bookmarkItems);
  const bookmarksReady = useAuthStore((s) => s.bookmarksReady);
  const bookmarksLoadFailed = useAuthStore((s) => s.bookmarksLoadFailed);
  const firestoreDegraded = useAuthStore((s) => s.firestoreDegraded);
  const bookmarksDegraded = useAuthStore((s) => s.bookmarksDegraded);
  const retryLoads = useAuthStore((s) => s.retryLoads);
  const addToast = useUIStore((s) => s.addToast);
  const requireAuth = useRequireAuth();

  const bookmarks = useMemo(
    () => Object.values(bookmarkItems)
      .filter((b) => !isRetiredId(b.canonical_id))
      .sort((a, b) => (b.bookmarked_at || '').localeCompare(a.bookmarked_at || '')),
    [bookmarkItems]
  );

  const bookmarkedIds = useMemo(() => new Set(Object.keys(bookmarkItems).filter((id) => !isRetiredId(id))), [bookmarkItems]);

  const toggleBookmark = async (id) => {
    if (!(await requireAuth())) return;
    const s = useAuthStore.getState();
    const uid = s.user.uid;
    if (s.accountBusy) return;
    if (isDebounced(`${uid}:${id}`)) return;
    if (s.bookmarksDegraded) { addToast(LIMITED_MSG, 'error'); return; }
    if (s.bookmarksLoadFailed) {
      addToast('Your bookmarks could not be loaded - retrying', 'error');
      s.retryLoads();
      return;
    }
    if (!s.bookmarksReady) { addToast('Still loading your bookmarks, try again in a moment', 'info'); return; }

    const wasBookmarked = !!s.bookmarkItems[id];
    if (!wasBookmarked && capacityLevel(s.bookmarksCapacity.usedBytes) === 'full') {
      addToast('Bookmark limit reached - remove some bookmarks to add new ones', 'error');
      return;
    }
    const entry = wasBookmarked ? null : { canonical_id: id, bookmarked_at: new Date().toISOString() };

    if (entry) s.setBookmarkItem(uid, id, entry);
    else s.removeBookmarkItem(uid, id);
    queueBookmarkWrite(uid, id, entry);
  };

  return {
    bookmarks,
    bookmarkedIds,
    isLoading: isAuthenticatedNow ? !bookmarksReady && !bookmarksLoadFailed : false,
    loadError: isAuthenticatedNow && bookmarksLoadFailed,
    retry: retryLoads,
    state: resourceState({ authed: isAuthenticatedNow, ready: bookmarksReady, failed: bookmarksLoadFailed }),
    isReady: isAuthenticatedNow && bookmarksReady && !bookmarksLoadFailed,
    degraded: bookmarksDegraded,
    firestoreDegraded,
    toggleBookmark,
    isBookmarked: (id) => bookmarkedIds.has(id),
  };
};

import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store.js';
import { useUIStore } from '../store/ui.store.js';
import { setBookmark } from '../services/firestore.js';

const DEBOUNCE_MS = 500;
const lastActionAt = new Map();
function isDebounced(key) {
  const last = lastActionAt.get(key);
  const now = Date.now();
  if (last && now - last < DEBOUNCE_MS) return true;
  lastActionAt.set(key, now);
  return false;
}

export const useBookmarks = () => {
  const user = useAuthStore((s) => s.user);
  const isAuthenticatedNow = useAuthStore((s) => !!s.user);
  const bookmarkItems = useAuthStore((s) => s.bookmarkItems);
  const bookmarksReady = useAuthStore((s) => s.bookmarksReady);
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();
  const location = useLocation();

  const bookmarks = useMemo(
    () => Object.entries(bookmarkItems)
      .map(([canonical_id, bookmarked_at]) => ({ canonical_id, bookmarked_at }))
      .sort((a, b) => (b.bookmarked_at || '').localeCompare(a.bookmarked_at || '')),
    [bookmarkItems]
  );

  const bookmarkedIds = useMemo(() => new Set(Object.keys(bookmarkItems)), [bookmarkItems]);

  const requireAuth = () => {
    if (isAuthenticatedNow) return true;
    navigate('/login', { state: { from: location.pathname } });
    return false;
  };

  const toggleBookmark = async (id) => {
    if (!requireAuth()) return;
    if (isDebounced(id)) return;

    const wasBookmarked = bookmarkedIds.has(id);
    try {
      await setBookmark(user.uid, id, !wasBookmarked);
      addToast(wasBookmarked ? 'Bookmark removed' : 'Bookmarked', wasBookmarked ? 'info' : 'success');
    } catch (err) {
      console.error('[useBookmarks] toggleBookmark failed', err);
      addToast('Failed to update bookmark', 'error');
    }
  };

  return {
    bookmarks,
    bookmarkedIds,
    isLoading: isAuthenticatedNow ? !bookmarksReady : false,
    toggleBookmark,
    isBookmarked: (id) => bookmarkedIds.has(id),
  };
};

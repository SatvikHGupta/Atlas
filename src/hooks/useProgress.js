import { useMemo, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store.js';
import { useUIStore } from '../store/ui.store.js';
import { markProgress, resetProgress as resetProgressDoc } from '../services/firestore.js';
import { getProblems as fetchAllProblems } from '../services/content/dataClient.js';
import { checkUnlock } from '../lib/roadmap.js';
import { getStats as computeStats } from '../lib/stats.js';

// UI-level debounce (docs/04 cost optimization #6): prevents a rapid
// alternating-click burst from firing a write per click. Per-id so marking
// two different problems in quick succession is unaffected.
const DEBOUNCE_MS = 500;
const lastActionAt = new Map();

function isDebounced(key) {
  const last = lastActionAt.get(key);
  const now = Date.now();
  if (last && now - last < DEBOUNCE_MS) return true;
  lastActionAt.set(key, now);
  return false;
}

/**
 * Live, Firestore-listener-backed progress state + mutations.
 *
 * Firestore's own local-write echo (latency compensation) means the UI
 * updates the instant a write is issued, before the server confirms - this
 * replaces the old hand-rolled optimistic-update/rollback machinery
 * (docs/04-FIRESTORE-SCHEMA-AND-RULES.md "Live sync pattern").
 */
export const useProgress = () => {
  const user = useAuthStore((s) => s.user);
  const isAuthenticatedNow = useAuthStore((s) => !!s.user);
  const progressItems = useAuthStore((s) => s.progressItems);
  const progressReady = useAuthStore((s) => s.progressReady);
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();
  const location = useLocation();

  const progressList = useMemo(
    () => Object.entries(progressItems).map(([canonical_id, v]) => ({ canonical_id, ...v })),
    [progressItems]
  );

  const progressMap = useMemo(
    () => Object.fromEntries(progressList.map((p) => [p.canonical_id, p.status])),
    [progressList]
  );

  const totalSolved = useMemo(() => progressList.filter((p) => p.status === 'solved').length, [progressList]);
  const totalAttempted = useMemo(() => progressList.filter((p) => p.status === 'attempted').length, [progressList]);

  // Locked decision (docs/06-AUTH-AND-ROUTING.md): a signed-out visitor
  // attempting to persist progress from a now-public page gets redirected
  // to /login, same as the old route-level gating did - centralized here
  // so every caller gets it automatically, not duplicated per component.
  const requireAuth = () => {
    if (isAuthenticatedNow) return true;
    navigate('/login', { state: { from: location.pathname } });
    return false;
  };

  const setStatus = async (id, status) => {
    if (!requireAuth()) return;
    if (isDebounced(`${id}:${status}`)) return;

    try {
      const result = await markProgress(user.uid, id, status, progressItems);
      if (result.skipped) return; // redundant write, nothing to do

      if (status === 'solved') {
        const allProblems = await fetchAllProblems();
        // Include the just-written solve in the solved-id set - the local
        // listener callback may not have fired yet at this exact instant.
        const solvedIds = new Set(progressList.filter((p) => p.status === 'solved').map((p) => p.canonical_id));
        solvedIds.add(id);

        const unlocked = checkUnlock(allProblems, solvedIds, id);
        if (unlocked) addToast(`🔓 Unlocked: ${unlocked.topic}`, 'success');
      }
    } catch (err) {
      console.error('[useProgress] markProgress failed', err);
      addToast('Failed to update progress', 'error');
    }
  };

  const resetProgress = async (id) => {
    if (!requireAuth()) return;
    try {
      await resetProgressDoc(user.uid, id);
    } catch (err) {
      console.error('[useProgress] resetProgress failed', err);
      addToast('Failed to reset progress', 'error');
    }
  };

  return {
    progressList,
    progressMap,
    isLoading: isAuthenticatedNow ? !progressReady : false,
    totalSolved,
    totalAttempted,
    getStatus: (id) => progressMap[id] || null,
    markSolved: (id) => setStatus(id, 'solved'),
    markAttempted: (id) => setStatus(id, 'attempted'),
    resetProgress,
  };
};

/**
 * Stats are pure derived data from already-in-memory state (progress items
 * + problems array) - zero additional Firestore reads (docs/04, cost
 * optimization #2/#7). The only genuinely async part is waiting for
 * problems.json to be in memory (near-instant if another page already
 * triggered the load; a real fetch otherwise).
 */
export const useProgressStats = () => {
  const isAuthenticatedNow = useAuthStore((s) => !!s.user);
  const progressItems = useAuthStore((s) => s.progressItems);
  const progressReady = useAuthStore((s) => s.progressReady);

  const progressList = useMemo(
    () => Object.entries(progressItems).map(([canonical_id, v]) => ({ canonical_id, ...v })),
    [progressItems]
  );

  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!isAuthenticatedNow || !progressReady) {
      setStats(null);
      return;
    }

    let cancelled = false;
    fetchAllProblems()
      .then((allProblems) => {
        if (cancelled) return;
        setStats(computeStats(progressList, allProblems));
      })
      .catch((err) => {
        // Previously unhandled - any throw here (bad data shape, etc.)
        // silently froze `stats` at its last successful value forever,
        // with no error and no way to tell it had stopped updating.
        if (cancelled) return;
        console.error('[useProgressStats] failed to compute stats:', err);
      });

    return () => { cancelled = true; };
  }, [isAuthenticatedNow, progressReady, progressList]);

  return {
    data: stats ? { data: stats } : undefined,
    isLoading: isAuthenticatedNow && (!progressReady || stats === null),
  };
};

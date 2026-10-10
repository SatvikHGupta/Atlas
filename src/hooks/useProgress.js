'use client';

import { useMemo } from 'react';
import { useAuthStore } from '../store/auth.store.js';
import { useUIStore } from '../store/ui.store.js';
import {
  markProgress, resetProgress as resetProgressDoc, isQuotaExhausted, progressQueue,
} from '../services/firestore.js';
import { getDsaIndex } from '../services/content/dataClient.js';
import { checkUnlock } from '../lib/roadmap.js';
import { shouldApply } from '../lib/sessionGuard.js';
import { createDebouncer } from '../lib/actionDebounce.js';
import { capacityLevel, isAllowedTransition } from '../lib/progressEntry.js';
import { resourceState } from '../lib/resourceState.js';
import { isRetiredId } from '../constants/retiredProblems.js';
import { useRequireAuth } from './useRequireAuth.js';

const { isDebounced } = createDebouncer({ windowMs: 500 });
const LIMITED_MSG = 'Service temporarily limited - resets at midnight PT';
const SOLVED_LOCKED_MSG = 'Already solved - unmark it first if you want to change it';

export const useProgress = () => {
  const isAuthenticatedNow = useAuthStore((s) => !!s.user);
  const progressItems = useAuthStore((s) => s.progressItems);
  const progressReady = useAuthStore((s) => s.progressReady);
  const progressLoadFailed = useAuthStore((s) => s.progressLoadFailed);
  const firestoreDegraded = useAuthStore((s) => s.firestoreDegraded);
  const progressDegraded = useAuthStore((s) => s.progressDegraded);
  const retryLoads = useAuthStore((s) => s.retryLoads);
  const addToast = useUIStore((s) => s.addToast);
  const requireAuth = useRequireAuth();

  const progressList = useMemo(
    () => Object.entries(progressItems).filter(([id]) => !isRetiredId(id)).map(([canonical_id, v]) => ({ canonical_id, ...v })),
    [progressItems]
  );

  const progressMap = useMemo(
    () => Object.fromEntries(progressList.map((p) => [p.canonical_id, p.status])),
    [progressList]
  );

  const totalSolved = useMemo(() => progressList.filter((p) => p.status === 'solved').length, [progressList]);
  const totalAttempted = useMemo(() => progressList.filter((p) => p.status === 'attempted').length, [progressList]);

  const preflight = async (id, debounceKey, isNewEntryCheck) => {
    if (!(await requireAuth())) return null;
    const s = useAuthStore.getState();
    const uid = s.user.uid;
    if (s.accountBusy) return null;
    if (debounceKey && isDebounced(`${uid}:${debounceKey}`)) return null;
    if (s.progressDegraded) { addToast(LIMITED_MSG, 'error'); return null; }
    if (s.progressLoadFailed) {
      addToast('Your progress could not be loaded - retrying', 'error');
      s.retryLoads();
      return null;
    }
    if (!s.progressReady) { addToast('Still loading your progress, try again in a moment', 'info'); return null; }
    if (isNewEntryCheck && !s.progressItems[id] && capacityLevel(s.progressCapacity.usedBytes) === 'full') {
      addToast('Tracking limit reached - reset some progress to track new problems', 'error');
      return null;
    }
    return { uid, ctx: { uid, session: s.authSession } };
  };

  const reportFailure = (err, ctx, failMessage) => {
    console.error('[useProgress] write failed', err);
    if (!shouldApply(useAuthStore.getState(), ctx)) return;
    if (isQuotaExhausted(err)) {
      useAuthStore.getState().setDegraded('progress', true);
      addToast(LIMITED_MSG, 'error');
    } else {
      addToast(failMessage, 'error');
    }
  };

  const setStatus = async (id, status, opts = {}) => {
    const pre = await preflight(id, `${id}:${status}`, true);
    if (!pre) return;
    const { uid, ctx } = pre;

    if (!isAllowedTransition(useAuthStore.getState().progressItems[id]?.status, status)) {
      addToast(SOLVED_LOCKED_MSG, 'info');
      return;
    }

    try {
      const outcome = await progressQueue.enqueue(uid, async () => {
        if (!shouldApply(useAuthStore.getState(), ctx)) return { dropped: true };
        const prev = useAuthStore.getState().progressItems[id] || null;
        return markProgress(uid, id, status, prev);
      });
      if (outcome.dropped || !shouldApply(useAuthStore.getState(), ctx)) return;

      const store = useAuthStore.getState();
      store.setDegraded('progress', false);
      if (outcome.entry) store.setProgressItem(uid, id, outcome.entry);
      if (outcome.blocked) addToast(SOLVED_LOCKED_MSG, 'info');
      if (outcome.skipped) return;
    } catch (err) {
      reportFailure(err, ctx, 'Failed to update progress');
      return;
    }

    if (status !== 'solved' || opts.roadmapProblem !== true) return;
    try {
      const allProblems = await getDsaIndex();
      if (!shouldApply(useAuthStore.getState(), ctx)) return;
      const solvedIds = new Set(
        Object.entries(useAuthStore.getState().progressItems)
          .filter(([, v]) => v.status === 'solved')
          .map(([key]) => key)
      );
      solvedIds.add(id);

      const unlocked = checkUnlock(allProblems, solvedIds, id);
      if (unlocked) addToast(unlocked.message || `Unlocked: ${unlocked.topic}`, 'success');
    } catch (err) {
      console.warn('[useProgress] unlock check failed (progress was saved)', err);
    }
  };

  const resetProgress = async (id) => {
    const pre = await preflight(id, null, false);
    if (!pre) return;
    const { uid, ctx } = pre;

    try {
      const outcome = await progressQueue.enqueue(uid, async () => {
        if (!shouldApply(useAuthStore.getState(), ctx)) return { dropped: true };
        await resetProgressDoc(uid, id);
        return {};
      });
      if (outcome.dropped || !shouldApply(useAuthStore.getState(), ctx)) return;
      const store = useAuthStore.getState();
      store.setDegraded('progress', false);
      store.removeProgressItem(uid, id);
    } catch (err) {
      reportFailure(err, ctx, 'Failed to reset progress');
    }
  };

  return {
    progressList,
    progressMap,
    isLoading: isAuthenticatedNow ? !progressReady && !progressLoadFailed : false,
    loadError: isAuthenticatedNow && progressLoadFailed,
    retry: retryLoads,
    state: resourceState({ authed: isAuthenticatedNow, ready: progressReady, failed: progressLoadFailed }),
    isReady: isAuthenticatedNow && progressReady && !progressLoadFailed,
    degraded: progressDegraded,
    firestoreDegraded,
    totalSolved,
    totalAttempted,
    getStatus: (id) => progressMap[id] || null,
    markSolved: (id, opts) => setStatus(id, 'solved', opts),
    markAttempted: (id, opts) => setStatus(id, 'attempted', opts),
    resetProgress,
  };
};

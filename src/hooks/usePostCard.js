'use client';

// One hook for both "Post your card" buttons (dashboard and settings profile). Author: Satvik Hemant Gupta
import { useCallback, useState } from 'react';
import { useAuth } from './useAuth.js';
import { useProgress } from './useProgress.js';
import { useUIStore } from '../store/ui.store.js';
import { getDsaIndex, getCpIndex } from '../services/content/dataClient.js';
import { getStats } from '../lib/stats.js';
import { needsCpIndex } from '../lib/resolveIds.js';
import { buildPostCardData } from '../lib/postCardData.js';

export const POST_CARD_HINT = 'Downloads a postcard to post progress';

export function usePostCard() {
  const { user } = useAuth();
  const { progressList } = useProgress();
  const addToast = useUIStore((s) => s.addToast);
  const [busy, setBusy] = useState(false);

  const download = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      // both indexes are cached module-level promises, so this is instant when the page already loaded them
      const allProblems = await getDsaIndex();
      const cpNeeded = needsCpIndex(progressList.map((p) => p.canonical_id), allProblems);
      const cpProblems = cpNeeded ? await getCpIndex() : [];
      const stats = getStats(progressList, allProblems, cpProblems);
      const data = buildPostCardData({ user, stats, allProblems, progressList });
      const { downloadPostCard } = await import('../lib/postCardDownload.js'); // canvas code only loads on click
      await downloadPostCard(data);
    } catch {
      addToast('Could not create your card. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  }, [busy, user, progressList, addToast]);

  return { download, busy };
}

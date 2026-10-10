'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProgress } from '../../../hooks/useProgress.js';
import { useBookmarks } from '../../../hooks/useBookmarks.js';
import { useDsaIndex } from '../../../hooks/useProblems.js';
import { shouldUseHistoryBack } from '../../../lib/backNav.js';
import styles from './ProblemDetail.module.css';

export function BackButton() {
  const router = useRouter();
  const handleBack = () => {
    const safe = typeof window !== 'undefined' && shouldUseHistoryBack({
      historyLength: window.history.length,
      referrer: document.referrer,
      origin: window.location.origin,
    });
    if (safe) router.back();
    else router.push('/problems');
  };
  return <button type="button" className={styles.backBtn} onClick={handleBack}>← Back</button>;
}

export function BookmarkButton({ canonicalId }) {
  const { isBookmarked, toggleBookmark, degraded: bookmarksDegraded } = useBookmarks();
  const bookmarked = isBookmarked(canonicalId);
  return (
    <button
      type="button"
      className={styles.bookmarkBtn}
      onClick={() => toggleBookmark(canonicalId)}
      aria-pressed={!!bookmarked}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark problem'}
      data-active={bookmarked}
      disabled={bookmarksDegraded}
      title={bookmarksDegraded ? 'Service temporarily limited - resets at midnight PT' : undefined}
    >
      <svg viewBox="0 0 16 16" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M4 2.5h8a.5.5 0 0 1 .5.5v10.6a.4.4 0 0 1-.62.33L8 11.1l-3.88 2.83A.4.4 0 0 1 3.5 13.6V3a.5.5 0 0 1 .5-.5Z" />
      </svg>
    </button>
  );
}

export function ProgressButtons({ canonicalId }) {
  const { getStatus, markSolved, markAttempted, resetProgress, degraded: progressDegraded } = useProgress();
  const status = getStatus(canonicalId);
  const degradedTitle = 'Service temporarily limited - resets at midnight PT';
  const { data: allProblems } = useDsaIndex();
  const isRoadmapProblem = useMemo(
    () => !!allProblems?.find((p) => p.canonical_id === canonicalId)?.is_atlas_roadmap,
    [allProblems, canonicalId]
  );
  const opts = { roadmapProblem: isRoadmapProblem };

  return (
    <>
      <button
        type="button"
        className={styles.solvedBtn}
        data-active={status === 'solved'}
        onClick={() => (status === 'solved' ? resetProgress(canonicalId) : markSolved(canonicalId, opts))}
        disabled={progressDegraded}
        title={progressDegraded ? degradedTitle : (status === 'solved' ? 'Click to unmark' : 'Mark as solved')}
      >
        {status === 'solved' ? '✓ Solved' : '✓ Mark Solved'}
      </button>
      <button
        type="button"
        className={styles.attemptedBtn}
        data-active={status === 'attempted'}
        onClick={() => (status === 'attempted' ? resetProgress(canonicalId) : markAttempted(canonicalId, opts))}
        disabled={progressDegraded}
        title={progressDegraded ? degradedTitle : (status === 'attempted' ? 'Click to unmark' : 'Mark as attempted')}
      >
        ~ Attempted
      </button>
    </>
  );
}

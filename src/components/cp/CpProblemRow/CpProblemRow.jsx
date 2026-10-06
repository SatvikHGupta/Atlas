'use client';

import { useEffect, useRef, useState } from 'react';
import { getAllCfPlatforms, getCfUrl, formatTopicLabel } from '../../../lib/codeforces.utils.js';
import { getDisplayRating, getMappingRating, getPrimaryMapping } from '../../../lib/cpRating.js';
import DifficultyBadge from '../../problem/DifficultyBadge/DifficultyBadge.jsx';
import RatingPill from '../RatingPill/RatingPill.jsx';
import styles from './CpProblemRow.module.css';

// `problem` is expected to already carry `_cfRating` (precomputed once in CpProblemsClient - see its
// doc comment - rather than re-deriving it here on every render for all 10,518 rows).
// ATLAS-BUG-003/016: progressLocked / bookmarksLocked come from the parent (not ready, failed, or quota-degraded for THAT resource).
// Locked buttons are disabled with a reason instead of firing and bouncing off a toast.
export default function CpProblemRow({ problem, status, solveCount, isBookmarked, onSolved, onAttempted, onReset, onBookmark, progressLocked = null, bookmarksLocked = null }) {
  const url = getCfUrl(problem);
  const cfPlatforms = getAllCfPlatforms(problem);
  const extraVariants = cfPlatforms.length - 1;
  // BUG-038: code, rating and link all come from the same primary mapping
  const problemCode = getPrimaryMapping(problem)?.platform_id || null;
  const rating = problem._cfRating !== undefined ? problem._cfRating : getDisplayRating(problem);

  // BUG-039: the "+N" control is a native <details>, so Enter/Space and focus work without custom key code.
  const variantsRef = useRef(null);
  const [variantsOpen, setVariantsOpen] = useState(false);
  useEffect(() => {
    if (!variantsOpen) return;
    const close = () => { if (variantsRef.current) variantsRef.current.open = false; };
    const onDown = (e) => { if (variantsRef.current && !variantsRef.current.contains(e.target)) close(); };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      close();
      variantsRef.current?.querySelector('summary')?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [variantsOpen]);

  const mainContent = (
    <>
      <span className={styles.badges}>
        <DifficultyBadge score={problem.difficulty} />
        <RatingPill rating={rating} />
      </span>
      <span className={styles.rowTitle}>{problem.title}</span>
      {problemCode && <span className={styles.problemCode}>{problemCode}</span>}
      {solveCount > 1 && (
        <span className={styles.solveCount} title={`Marked solved ${solveCount} times`}>{'\u00d7'}{solveCount}</span>
      )}
    </>
  );

  return (
    <div className={styles.row} data-status={status || ''}>
      {/* BUG-006/007: a real anchor gives native Enter, open-in-new-tab and context menu. The buttons below are
          siblings of it, never nested inside, so no stopPropagation is needed. */}
      {url ? (
        <a className={`${styles.rowMain} ${styles.rowLink}`} href={url} target="_blank" rel="noopener noreferrer">
          {mainContent}
        </a>
      ) : (
        <div className={styles.rowMain}>{mainContent}</div>
      )}

      <div className={styles.rowTags}>
        {extraVariants > 0 && (
          <details
            className={styles.variantsWrap}
            ref={variantsRef}
            onToggle={(e) => setVariantsOpen(e.currentTarget.open)}
          >
            <summary
              className={styles.variantsSummary}
              title={`Also maps to ${extraVariants} other Codeforces problem${extraVariants > 1 ? 's' : ''}`}
            >
              +{extraVariants}
            </summary>
            <ul className={styles.variantsList}>
              {cfPlatforms.map((m) => (
                <li key={m.url || m.platform_id}>
                  <a className={styles.variantsItem} href={m.url} target="_blank" rel="noopener noreferrer">
                    <RatingPill rating={getMappingRating(m)} />
                    <span className={styles.problemCode}>{m.platform_id}</span>
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
        {(problem.topics_display ?? problem.topics)?.slice(0, 2).map((t) => (
          <span key={t} className={styles.topicTag}>{formatTopicLabel(t)}</span>
        ))}
      </div>

      <div className={styles.rowActions}>
        <button
          className={styles.markBtn} data-type="solved" data-active={status === 'solved'}
          aria-pressed={status === 'solved'} aria-label="Solved" disabled={!!progressLocked}
          title={progressLocked || (status === 'solved' ? 'Mark unsolved' : 'Mark solved')}
          onClick={status === 'solved' ? onReset : onSolved}
        >{'\u2713'}</button>
        <button
          className={styles.markBtn} data-type="attempted" data-active={status === 'attempted'}
          aria-pressed={status === 'attempted'} aria-label="Attempted" disabled={!!progressLocked}
          title={progressLocked || (status === 'attempted' ? 'Remove attempted' : status === 'solved' ? 'Already solved - unmark it first' : 'Mark attempted')}
          onClick={status === 'attempted' ? onReset : onAttempted}
        >~</button>
        <button
          className={styles.markBtn} data-type="bookmark" data-active={isBookmarked}
          aria-pressed={isBookmarked} aria-label="Bookmark" disabled={!!bookmarksLocked}
          title={bookmarksLocked || (isBookmarked ? 'Remove bookmark' : 'Bookmark')}
          onClick={onBookmark}
        >{isBookmarked ? '\u2605' : '\u2606'}</button>
        {url && (
          <a className={styles.cfLink} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${problem.title} on Codeforces`}>
            {'\u2197'} CF
          </a>
        )}
      </div>
    </div>
  );
}

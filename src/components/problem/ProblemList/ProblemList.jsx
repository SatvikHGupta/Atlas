import { useState } from 'react';
import ProblemCard from '../ProblemCard/ProblemCard.jsx';
import SkeletonCard from '../../ui/Loader/SkeletonCard.jsx';
import { useBookmarks } from '../../../hooks/useBookmarks.js';
import { useProgress } from '../../../hooks/useProgress.js';
import styles from './ProblemList.module.css';

function Pagination({ page, totalPages, onPageChange }) {
  const [inputVal, setInputVal] = useState('');

  const handleJump = (e) => {
    if (e.key === 'Enter') {
      const n = parseInt(inputVal, 10);
      if (n >= 1 && n <= totalPages) {
        onPageChange(n);
        setInputVal('');
      }
    }
  };

  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageBtn}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← Prev
      </button>

      <div className={styles.pageCenter}>
        <span className={styles.pageInfo}>{page} / {totalPages}</span>
        <input
          className={styles.pageInput}
          type="number"
          min="1"
          max={totalPages}
          placeholder="Go to"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleJump}
          title="Type a page number and press Enter"
        />
      </div>

      <button
        className={styles.pageBtn}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next →
      </button>
    </div>
  );
}

export default function ProblemList({ problems, isLoading, total, page, limit, onPageChange, onRandom }) {
  const { bookmarkedIds, toggleBookmark } = useBookmarks();
  const { progressMap } = useProgress();

  if (isLoading) {
    return (
      <div className={styles.grid} aria-busy="true" aria-label="Loading problems">
        {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!problems?.length) {
    return (
      <div className={styles.empty}>
        <p>No problems match your filters.</p>
        <span className={styles.emptyHint}>Try adjusting the difficulty or topic.</span>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className={styles.wrapper}>
      <div className={styles.countRow}>
        <div className={styles.count}>{total?.toLocaleString()} problems</div>
        {onRandom && (
          <button
            type="button"
            className={styles.randomBtn}
            onClick={onRandom}
            title="Open a random problem from the current filters"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 4.5h2.2c1.6 0 2.5.8 3.4 2.2l1.1 1.6c.9 1.4 1.8 2.2 3.4 2.2H14M2 11.5h2.2c1 0 1.7-.3 2.3-.9M14 4.5h-1.9c-1 0-1.7.3-2.3.9M12.5 2.5 14.5 4.5l-2 2M12.5 9.5l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Random
          </button>
        )}
      </div>

      <div className={styles.grid}>
        {problems.map((p) => (
          <ProblemCard
            key={p.canonical_id}
            problem={p}
            isBookmarked={bookmarkedIds.has(p.canonical_id)}
            status={progressMap[p.canonical_id] || null}
            onBookmark={toggleBookmark}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  );
}

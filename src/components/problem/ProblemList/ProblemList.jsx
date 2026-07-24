import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import ProblemCard from '../ProblemCard/ProblemCard.jsx';
import SkeletonCard from '../../ui/Loader/SkeletonCard.jsx';
import { useBookmarks } from '../../../hooks/useBookmarks.js';
import { useProgress } from '../../../hooks/useProgress.js';
import styles from './ProblemList.module.css';

// useBookmarks and useProgress are called ONCE here, not per card.
// progressMap and bookmarkedIds are memoized inside their hooks so
// they only rebuild when the underlying data actually changes.

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

export default function ProblemList({ problems, isLoading, total, page, limit, onPageChange }) {
  const { bookmarkedIds, toggleBookmark } = useBookmarks();
  const { progressMap } = useProgress();

  if (isLoading) {
    return (
      <div className={styles.grid}>
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
      <div className={styles.count}>{total?.toLocaleString()} problems</div>

      <AnimatePresence mode="wait">
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
      </AnimatePresence>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  );
}

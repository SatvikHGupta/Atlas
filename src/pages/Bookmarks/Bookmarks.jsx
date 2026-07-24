import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { motion } from 'motion/react';
import { useBookmarks } from '../../hooks/useBookmarks.js';
import { useProgress } from '../../hooks/useProgress.js';
import { useProblemLookup } from '../../hooks/useProblemLookup.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import DifficultyBadge from '../../components/problem/DifficultyBadge/DifficultyBadge.jsx';
import { Loader } from '../../components/ui/Loader/Loader.jsx';
import styles from './Bookmarks.module.css';

export default function Bookmarks() {
  usePageTitle('Bookmarks');
  const { bookmarks, isLoading, toggleBookmark } = useBookmarks();
  const { getStatus } = useProgress();
  const problemMap = useProblemLookup();

  return (
    <PageWrapper>
      <div className={styles.wrapper}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className={styles.title}>Bookmarks</h1>
          <span className={styles.count}>{bookmarks.length} saved</span>
        </motion.div>

        {isLoading ? (
          <div className={styles.loading}><Loader size={28} /></div>
        ) : bookmarks.length === 0 ? (
          <div className={styles.empty}>
            <p>No bookmarks yet.</p>
            <span>Star a problem from the DSA Problems list to save it here.</span>
          </div>
        ) : (
          <motion.div
            className={styles.list}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
          >
            {bookmarks.map((b, i) => (
              <BookmarkRow
                key={b.canonical_id}
                bookmark={b}
                enriched={problemMap[b.canonical_id]}
                index={i}
                status={getStatus(b.canonical_id)}
                onRemove={() => toggleBookmark(b.canonical_id)}
              />
            ))}
          </motion.div>
        )}
      </div>
    </PageWrapper>
  );
}

function BookmarkRow({ bookmark: b, enriched, index, status, onRemove }) {
  const navigate = useNavigate();

  const title      = enriched?.title;
  const slug       = enriched?.slug;
  const difficulty = enriched?.difficulty ?? null;
  const topics     = enriched?.topics || [];
  const isCp       = enriched?.isCp ?? (b.canonical_id?.includes('codeforces') || b.canonical_id?.includes('cf_'));

  const displayTitle = title
    ? title
    : <span className={styles.unknownTitle}>{isCp ? 'Codeforces problem' : 'Unknown problem'}</span>;

  return (
    <motion.div
      className={styles.row}
      data-status={status || ''}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <div
        className={styles.rowMain}
        onClick={() => slug && navigate(`/problems/${slug}`)}
        role={slug ? 'link' : undefined}
        tabIndex={slug ? 0 : undefined}
        onKeyDown={(e) => e.key === 'Enter' && slug && navigate(`/problems/${slug}`)}
      >
        <DifficultyBadge score={difficulty} />
        <span className={styles.rowTitle}>{displayTitle}</span>
        <div className={styles.tags}>
          {topics.slice(0, 2).map((t) => (
            <span key={t} className={styles.tag}>{t}</span>
          ))}
        </div>
      </div>

      <div className={styles.rowRight}>
        {status && <span className={styles.statusDot} data-status={status} title={status} />}
        <button
          className={styles.removeBtn}
          onClick={onRemove}
          title="Remove bookmark"
        >
          ★
        </button>
      </div>
    </motion.div>
  );
}

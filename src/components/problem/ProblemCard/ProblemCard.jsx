import { memo } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import DifficultyBadge from '../DifficultyBadge/DifficultyBadge.jsx';
import { getDifficultyColor, getDifficultyBg } from '../../../utils/difficulty.utils.js';
import styles from './ProblemCard.module.css';

const HIDDEN_TAGS = new Set(['Union-Find', 'union-find', 'Union Find']);

// Pure presentational component- no hooks.
// isBookmarked, status, and onBookmark are passed from ProblemList which
// calls useBookmarks/useProgress once for the whole grid, not per card.
// memo prevents re-renders when sibling cards update.
const ProblemCard = memo(function ProblemCard({ problem, isBookmarked, status, onBookmark }) {
  const handleBookmark = (e) => {
    e.preventDefault();
    onBookmark(problem.canonical_id);
  };

  const visibleTopics = (problem.topics || [])
    .filter((t) => !HIDDEN_TAGS.has(t))
    .slice(0, 2);

  const diffColor = getDifficultyColor(problem.difficulty);
  const diffBg    = getDifficultyBg(problem.difficulty);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Link to={`/problems/${problem.slug}`} className={styles.card}>
        <div className={styles.top}>
          <span className={styles.title}>
            {status && <span className={styles.statusDot} data-status={status} aria-hidden="true" />}
            {problem.title}
          </span>
          <button className={styles.bookmarkBtn} onClick={handleBookmark} aria-label="bookmark">
            {isBookmarked ? '★' : '☆'}
          </button>
        </div>

        <div className={styles.meta}>
          <DifficultyBadge score={problem.difficulty} />

          {visibleTopics.map((t) => (
            <span key={t} className={styles.tag}>{t}</span>
          ))}

          {problem.difficulty != null && (
            <span
              className={styles.diffScore}
              style={{ color: diffColor, borderColor: diffColor + '44', background: diffBg }}
            >
              {problem.difficulty}/10
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
});

export default ProblemCard;

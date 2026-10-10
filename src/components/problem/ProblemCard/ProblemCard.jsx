'use client';

import { memo } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useAuthStore } from '../../../store/auth.store.js';
import DifficultyBadge from '../DifficultyBadge/DifficultyBadge.jsx';
import { getDifficultyColor, getDifficultyBg } from '../../../lib/difficulty.utils.js';
import { getPrimaryPlatform } from '../../../lib/platforms.utils.js';
import styles from './ProblemCard.module.css';

const HIDDEN_TAGS = new Set(['Union-Find', 'union-find', 'Union Find']);

const ProblemCard = memo(function ProblemCard({ problem, isBookmarked, status, onBookmark }) {
  const bookmarksDegraded = useAuthStore((s) => s.bookmarksDegraded);
  const handleBookmark = () => {
    if (bookmarksDegraded) return;
    onBookmark(problem.canonical_id);
  };

  const visibleTopics = (problem.topics_display ?? problem.topics ?? [])
    .filter((t) => !HIDDEN_TAGS.has(t))
    .slice(0, 2);

  const diffColor = getDifficultyColor(problem.difficulty);
  const diffBg    = getDifficultyBg(problem.difficulty);
  const platform  = getPrimaryPlatform(problem);
  const hasFrequency = problem.frequency_score > 0;

  return (
    <motion.article
      className={styles.card}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className={styles.top}>
        <h3 className={`${styles.title} ${styles.titleReset}`}>
          {status && (
            <span className={styles.statusDot} data-status={status} aria-hidden="true">
              {status === 'solved' ? (
                <svg viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M5 8.3 7.1 10.4 11 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8 5v3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <circle cx="8" cy="10.7" r="0.9" fill="currentColor" />
                </svg>
              )}
            </span>
          )}
          {status && (
            <span className={styles.srOnlyText}>
              {status === 'solved' ? 'Solved: ' : 'Attempted: '}
            </span>
          )}
          <Link href={`/problems/${problem.slug}`} className={styles.titleLink}>
            {problem.title}
          </Link>
        </h3>
        <button
          type="button"
          className={`${styles.bookmarkBtn} ${styles.bookmarkRaised}`}
          onClick={handleBookmark}
          aria-pressed={!!isBookmarked}
          aria-label={isBookmarked ? `Remove bookmark: ${problem.title}` : `Bookmark ${problem.title}`}
          data-active={isBookmarked}
          disabled={bookmarksDegraded}
          title={bookmarksDegraded ? 'Service temporarily limited - resets at midnight PT' : undefined}
        >
          <svg viewBox="0 0 16 16" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
            <path d="M4 2.5h8a.5.5 0 0 1 .5.5v10.6a.4.4 0 0 1-.62.33L8 11.1l-3.88 2.83A.4.4 0 0 1 3.5 13.6V3a.5.5 0 0 1 .5-.5Z" />
          </svg>
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
            style={{ color: diffColor, borderColor: `color-mix(in srgb, ${diffColor} 27%, transparent)`, background: diffBg }}
          >
            {problem.difficulty}/10
          </span>
        )}

        {hasFrequency && (
          <span className={styles.frequencyBadge} title={`Frequency score ${problem.frequency_score}`}>
            {'\u{1F525}'}
          </span>
        )}
        {platform && (
          <span className={styles.platformBadge} style={{ color: platform.color, borderColor: `${platform.color}44` }}>
            {platform.label}
          </span>
        )}
      </div>
    </motion.article>
  );
});

export default ProblemCard;

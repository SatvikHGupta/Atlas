import { useQuery } from '@tanstack/react-query';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { notesService } from '../../services/notes.service.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import styles from './Notes.module.css';

const LEVEL_COLORS = ['#6c63ff','#22c55e','#f97316','#06b6d4','#a855f7','#facc15','#ec4899','#14b8a6','#94a3b8'];

export default function Notes() {
  usePageTitle('Notes');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['notes-index'],
    queryFn:  notesService.getIndex,
    staleTime: 30 * 60 * 1000,
  });

  const index = data?.data;

  return (
    <PageWrapper>
      <div className={styles.wrapper}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className={styles.title}>DSA Notes</h1>
          <p className={styles.subtitle}>
            In-depth study guides for every major DSA topic - from foundations to advanced algorithms.
            {index && (
              <span className={styles.progress}>
                {' '}{index.ready}/{index.total} available
              </span>
            )}
          </p>
        </motion.div>

        {isError && (
          <div className={styles.error}>⚠ Couldn't load notes index. Make sure the backend is running.</div>
        )}

        {isLoading && (
          <div className={styles.loading}>Loading notes...</div>
        )}

        {index?.levels.map((level, li) => (
          <motion.div
            key={level.level}
            className={styles.levelGroup}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: li * 0.05 }}
          >
            <div className={styles.levelHeader}>
              <span
                className={styles.levelBadge}
                style={{ background: LEVEL_COLORS[level.level % LEVEL_COLORS.length] + '22',
                         color:      LEVEL_COLORS[level.level % LEVEL_COLORS.length] }}
              >
                Level {level.level === 8 ? '★' : level.level}
              </span>
              <h2 className={styles.levelName}>{level.name}</h2>
            </div>

            <div className={styles.topicsGrid}>
              {level.topics.map((topic) => (
                <TopicCard key={topic.slug} topic={topic} color={LEVEL_COLORS[level.level % LEVEL_COLORS.length]} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </PageWrapper>
  );
}

function TopicCard({ topic, color }) {
  if (!topic.available) {
    return (
      <div className={styles.card} data-unavailable="true">
        <div className={styles.cardIcon} style={{ background: color + '18', color }}>
          ◷
        </div>
        <div className={styles.cardBody}>
          <span className={styles.cardTitle}>{topic.topic}</span>
          <span className={styles.cardStatus}>Coming soon</span>
        </div>
      </div>
    );
  }

  return (
    <Link to={`/notes/${topic.slug}`} className={styles.card}>
      <div className={styles.cardIcon} style={{ background: color + '18', color }}>
        ◈
      </div>
      <div className={styles.cardBody}>
        <span className={styles.cardTitle}>{topic.topic}</span>
        <span className={styles.cardStatus} data-ready="true">Read →</span>
      </div>
    </Link>
  );
}

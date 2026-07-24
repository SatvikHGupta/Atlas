import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useRoadmapLevel } from '../../hooks/useRoadmap.js';
import { useProgress } from '../../hooks/useProgress.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import DifficultyBadge from '../../components/problem/DifficultyBadge/DifficultyBadge.jsx';
import { ROADMAP_LEVELS, UNLOCK_THRESHOLD } from '../../constants/roadmap.js';
import { Loader } from '../../components/ui/Loader/Loader.jsx';
import styles from './RoadmapLevel.module.css';


export default function RoadmapLevel() {
  const { level } = useParams();
  const levelNum = parseInt(level, 10);
  const { data, isLoading } = useRoadmapLevel(levelNum);
  const { getStatus, markSolved, markAttempted, resetProgress } = useProgress();

  const levelInfo = ROADMAP_LEVELS?.[levelNum];
  const problems  = data?.data || [];

  const totalSolvedInLevel = problems.filter(
    (p) => getStatus(p.canonical_id) === 'solved'
  ).length;
  const levelUnlocked = totalSolvedInLevel >= UNLOCK_THRESHOLD;

  const byTopic = problems.reduce((acc, p) => {
    const key = p.roadmap_topic || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <PageWrapper>
        <div className={styles.loading}><Loader size={32} /></div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className={styles.wrapper}>
        <div className={styles.breadcrumb}>
          <Link to="/roadmap" className={styles.back}>← Atlas Roadmap</Link>
        </div>

        <div className={styles.header}>
          <span className={styles.levelBadge}>Level {levelNum}</span>
          <h1>{levelInfo?.title || `Level ${levelNum}`}</h1>
        </div>

        <div className={styles.levelProgress}>
          <div className={styles.levelProgressHeader}>
            <span className={styles.levelProgressLabel}>
              {totalSolvedInLevel}/{UNLOCK_THRESHOLD} to unlock next level
            </span>
            {levelUnlocked && (
              <span className={styles.levelUnlocked}>✓ Level complete</span>
            )}
          </div>
          <div className={styles.progressTrack}>
            <motion.div
              className={styles.progressFill}
              style={{ transformOrigin: 'left' }}
              initial={{ scaleX: 0 }}
              animate={{
                scaleX: Math.min(totalSolvedInLevel / UNLOCK_THRESHOLD, 1),
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {Object.entries(byTopic).map(([topic, topicProblems], idx) => (
          <motion.section
            key={topic}
            className={styles.topicSection}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <div className={styles.topicHeader}>
              <h2 className={styles.topicTitle}>{topic}</h2>
              <span className={styles.topicCount}>
                {topicProblems.filter((p) => getStatus(p.canonical_id) === 'solved').length}/
                {topicProblems.length} solved
              </span>
            </div>

            <div className={styles.problemList}>
              {topicProblems.map((p) => {
                const status = getStatus(p.canonical_id);
                return (
                  <div key={p.canonical_id} className={styles.row} data-status={status}>
                    <Link to={`/problems/${p.slug}`} className={styles.rowTitle}>
                      {p.title}
                    </Link>
                    <DifficultyBadge score={p.difficulty} />
                    <div className={styles.rowActions}>
                      <button
                        className={styles.actionBtn}
                        data-active={status === 'solved'}
                        onClick={() => status === 'solved' ? resetProgress(p.canonical_id) : markSolved(p.canonical_id)}
                        title={status === 'solved' ? 'Click to unmark' : 'Mark solved'}
                      >✓</button>
                      <button
                        className={styles.actionBtn}
                        data-active={status === 'attempted'}
                        onClick={() => status === 'attempted' ? resetProgress(p.canonical_id) : markAttempted(p.canonical_id)}
                        title={status === 'attempted' ? 'Click to unmark' : 'Mark attempted'}
                      >~</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        ))}
      </div>
    </PageWrapper>
  );
}

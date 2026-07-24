import { motion } from 'motion/react';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { Link } from 'react-router-dom';
import { useRoadmap } from '../../hooks/useRoadmap.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import ProgressRing from '../../components/charts/ProgressRing/ProgressRing.jsx';
import { Loader } from '../../components/ui/Loader/Loader.jsx';
import styles from './Roadmap.module.css';

export default function Roadmap() {
  usePageTitle('Roadmap');
  const { data, isLoading } = useRoadmap();
  const levels = data?.data || [];

  if (isLoading) {
    return <PageWrapper><div className={styles.loading}><Loader size={32} /></div></PageWrapper>;
  }

  return (
    <PageWrapper>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1>Atlas Roadmap</h1>
          <p>Complete 5 problems per topic to unlock the next. Level up from 0 to advanced.</p>
        </div>

        <div className={styles.levels}>
          {levels.map((level, idx) => (
            <motion.div
              key={level.level}
              className={styles.levelCard}
              data-locked={!level.isUnlocked}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
            >
              <div className={styles.levelHeader}>
                <div className={styles.levelMeta}>
                  <span className={styles.levelNum}>Level {level.level}</span>
                  <h2 className={styles.levelTitle}>{level.title}</h2>
                  {!level.isUnlocked && <span className={styles.lockIcon}>🔒</span>}
                </div>
                <ProgressRing
                  value={level.solvedProblems}
                  total={level.totalProblems}
                  size={72}
                />
              </div>

              <div className={styles.topics}>
                {(level.topics || []).map((topic) => {
                  const topicName = typeof topic === 'string' ? topic : topic.name;
                  const solved = topic.solvedProblems || 0;
                  const total = topic.totalProblems || 0;
                  const unlocked = topic.isUnlocked !== false;

                  return (
                    <Link
                      key={topicName}
                      to={`/roadmap/${level.level}`}
                      className={styles.topicChip}
                      data-locked={!unlocked}
                    >
                      <span className={styles.topicName}>{topicName}</span>
                      {total > 0 && (
                        <span className={styles.topicProgress}>{solved}/{total}</span>
                      )}
                    </Link>
                  );
                })}
              </div>

              <Link to={`/roadmap/${level.level}`} className={styles.goBtn}>
                {level.isUnlocked ? 'View Problems →' : 'Locked'}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}

'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { useRoadmap } from '../../hooks/useRoadmap.js';
import { formatLockHint, visibleRoadmap } from '../../lib/roadmap.js';
import { UNLOCK_THRESHOLD } from '../../constants/roadmap.js';
import { NOTES_TOPICS_INDEX } from '../../constants/notes.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import ProgressRing from '../../components/charts/ProgressRing/ProgressRing.jsx';
import styles from './Roadmap.module.css';

const TOPIC_NAME_BY_SLUG = Object.fromEntries(NOTES_TOPICS_INDEX.map((t) => [t.slug, t.topic]));

// BUG-094: skeleton until the index AND (when signed in) progress are ready, so locked state never flashes.
function RoadmapSkeleton() {
  return (
    <PageWrapper>
      <div className={styles.wrapper} aria-busy="true" aria-label="Loading roadmap">
        {[0, 1, 2].map((i) => <div key={i} className={styles.skeletonCard} />)}
      </div>
    </PageWrapper>
  );
}

export default function RoadmapClient() {
  const { data, isReady, isError, refetch } = useRoadmap();
  // empty topics / levels are removed from what is shown (lib/roadmap.js visibleRoadmap); unlock logic is unaffected
  const levels = visibleRoadmap(data || []);

  // The roadmap must never silently render empty.
  if (isError) {
    return (
      <PageWrapper>
        <div className={styles.wrapper}>
          <div className={styles.errorBox} role="alert">
            <p>Couldn&apos;t load the roadmap.</p>
            <button className={styles.retryBtn} onClick={refetch}>Retry</button>
          </div>
        </div>
      </PageWrapper>
    );
  }
  if (!isReady) return <RoadmapSkeleton />;

  return (
    <PageWrapper>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1>Atlas Roadmap</h1>
          <p>
            Complete {UNLOCK_THRESHOLD} problems in every topic of a level (or all of them, if a topic has fewer)
            to unlock the next. Level up from 0 to advanced.
          </p>
        </div>

        <div className={styles.levels}>
          {levels.map((level, idx) => {
            const hint = formatLockHint(level.level, level.missingTopics, TOPIC_NAME_BY_SLUG);
            return (
              <motion.div
                key={level.level}
                className={styles.levelCard}
                data-locked={!level.isUnlocked}
                aria-disabled={!level.isUnlocked || undefined}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <div className={styles.levelHeader}>
                  <div className={styles.levelMeta}>
                    <span className={styles.levelNum}>Level {level.level}</span>
                    <h2 className={styles.levelTitle}>{level.title}</h2>
                    {!level.isUnlocked && <span className={styles.lockIcon}>🔒</span>}
                    {level.isFinal && <span className={styles.finalLabel}>Final level</span>}
                  </div>
                  <ProgressRing value={level.solvedProblems} total={level.totalProblems} size={72} />
                </div>

                {level.description && <p className={styles.levelDescription}>{level.description}</p>}

                <div className={styles.topics}>
                  {(level.topics || []).map((topic) => {
                    const topicName = TOPIC_NAME_BY_SLUG[topic.slug] || topic.slug;

                    const chip = (
                      <>
                        <span className={styles.topicName}>{topicName}</span>
                        <span className={styles.topicProgress}>
                          {topic.isComplete ? '✓ ' : ''}{topic.solvedProblems}/{topic.totalProblems}
                        </span>
                      </>
                    );

                    // BUG-088: chips of a locked level are not links.
                    return level.isUnlocked ? (
                      <Link key={topic.slug} href={`/roadmap/${level.level}`} className={styles.topicChip}>
                        {chip}
                      </Link>
                    ) : (
                      <span key={topic.slug} className={styles.topicChip} data-locked="true">{chip}</span>
                    );
                  })}
                </div>

                {level.isUnlocked ? (
                  <Link href={`/roadmap/${level.level}`} className={styles.goBtn}>View Problems →</Link>
                ) : (
                  // BUG-087/088: a locked level is not a link, it says what to finish first.
                  <p className={styles.lockHint}>{hint}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </PageWrapper>
  );
}

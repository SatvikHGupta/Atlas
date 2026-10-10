'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useRoadmap, useRoadmapLevel } from '../../../hooks/useRoadmap.js';
import { useProgress } from '../../../hooks/useProgress.js';
import { formatLockHint } from '../../../lib/roadmap.js';
import PageWrapper from '../../../components/layout/PageWrapper/PageWrapper.jsx';
import DifficultyBadge from '../../../components/problem/DifficultyBadge/DifficultyBadge.jsx';
import { ROADMAP_LEVELS } from '../../../constants/roadmap.js';
import { NOTES_TOPICS_INDEX } from '../../../constants/notes.js';
import { Loader } from '../../../components/ui/Loader/Loader.jsx';
import styles from './RoadmapLevel.module.css';
import roadmapStyles from '../Roadmap.module.css';

const TOPIC_NAME_BY_SLUG = Object.fromEntries(NOTES_TOPICS_INDEX.map((t) => [t.slug, t.topic]));

export default function RoadmapLevelClient({ levelNum }) {
  const { data: problemsData, isLoading: problemsLoading } = useRoadmapLevel(levelNum);
  const { data: levels, isReady, isError, refetch } = useRoadmap();
  const { getStatus, markSolved, markAttempted, resetProgress, state: progressState, degraded: progressDegraded } = useProgress();
  const progressLocked = progressState === 'loading' ? 'Loading your progress...'
    : progressState === 'failed' ? "Couldn't load your progress"
    : progressDegraded ? 'Service temporarily limited - resets at midnight PT' : null;

  const levelInfo = ROADMAP_LEVELS?.[levelNum];
  const levelState = levels?.[levelNum];
  const problems = problemsData || [];

  if (isError) {
    return (
      <PageWrapper>
        <div className={styles.wrapper}>
          <div className={roadmapStyles.errorBox} role="alert">
            <p>Couldn&apos;t load this level.</p>
            <button className={roadmapStyles.retryBtn} onClick={refetch}>Retry</button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!isReady || problemsLoading || !levelState) {
    return <PageWrapper><div className={styles.loading}><Loader size={32} /></div></PageWrapper>;
  }

  if (!levelState.isUnlocked) {
    return (
      <PageWrapper>
        <div className={styles.wrapper}>
          <div className={styles.breadcrumb}>
            <Link href="/roadmap" className={styles.back}>← Atlas Roadmap</Link>
          </div>
          <div className={roadmapStyles.lockedScreen}>
            <span className={styles.levelBadge}>Level {levelNum}</span>
            <h1>🔒 {levelInfo?.title || `Level ${levelNum}`}</h1>
            <p>{formatLockHint(levelNum, levelState.missingTopics, TOPIC_NAME_BY_SLUG)}.</p>
            <Link href={`/roadmap/${levelNum - 1}`} className={roadmapStyles.lockedLink}>
              ← Back to Level {levelNum - 1}
            </Link>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const topicStateBySlug = Object.fromEntries(levelState.topics.map((t) => [t.slug, t]));
  const nonEmptyTopics = levelState.topics.filter((t) => !t.isEmpty);
  const completeTopics = nonEmptyTopics.filter((t) => t.isComplete).length;
  const progressFraction = nonEmptyTopics.length ? completeTopics / nonEmptyTopics.length : 1;

  const byTopic = problems.reduce((acc, p) => {
    const key = p.roadmap_topic || 'general';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const progressLabel = levelState.isFinal
    ? `Final level - ${completeTopics}/${nonEmptyTopics.length} topics complete`
    : `${completeTopics}/${nonEmptyTopics.length} topics complete to unlock Level ${levelNum + 1}`;

  return (
    <PageWrapper>
      <div className={styles.wrapper}>
        <div className={styles.breadcrumb}>
          <Link href="/roadmap" className={styles.back}>← Atlas Roadmap</Link>
        </div>

        <div className={styles.header}>
          <span className={styles.levelBadge}>Level {levelNum}</span>
          <h1>{levelInfo?.title || `Level ${levelNum}`}</h1>
          {levelInfo?.description && <p className={styles.levelDescription}>{levelInfo.description}</p>}
        </div>

        <div className={styles.levelProgress}>
          <div className={styles.levelProgressHeader}>
            <span className={styles.levelProgressLabel}>{progressLabel}</span>
            {levelState.isComplete && <span className={styles.levelUnlocked}>✓ Level complete</span>}
          </div>
          <div className={styles.progressTrack}>
            <motion.div
              className={styles.progressFill}
              style={{ transformOrigin: 'left' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: Math.min(progressFraction, 1) }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {Object.entries(byTopic).map(([topicSlug, topicProblems], idx) => {
          const topicState = topicStateBySlug[topicSlug];
          const solvedInTopic = topicProblems.filter((p) => getStatus(p.canonical_id) === 'solved').length;
          return (
            <motion.section
              key={topicSlug}
              className={styles.topicSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className={styles.topicHeader}>
                <h2 className={styles.topicTitle}>
                  <Link href={`/notes/${topicSlug}`}>{TOPIC_NAME_BY_SLUG[topicSlug] || topicSlug}</Link>
                </h2>
                <span className={styles.topicCount}>
                  {solvedInTopic}/{topicProblems.length} solved
                  {topicState?.isComplete ? ' ✓' : topicState ? ` (need ${topicState.threshold})` : ''}
                </span>
              </div>

              <div className={styles.problemList}>
                {topicProblems.map((p) => {
                  const status = getStatus(p.canonical_id);
                  return (
                    <div key={p.canonical_id} className={styles.row} data-status={status}>
                      <Link href={`/problems/${p.slug}`} className={styles.rowTitle}>{p.title}</Link>
                      <DifficultyBadge score={p.difficulty} />
                      <div className={styles.rowActions}>
                        <button
                          className={styles.actionBtn}
                          data-active={status === 'solved'}
                          onClick={() => (status === 'solved' ? resetProgress(p.canonical_id) : markSolved(p.canonical_id, { roadmapProblem: true }))}
                          disabled={!!progressLocked}
                          title={progressLocked || (status === 'solved' ? 'Click to unmark' : 'Mark solved')}
                        >✓</button>
                        <button
                          className={styles.actionBtn}
                          data-active={status === 'attempted'}
                          onClick={() => (status === 'attempted' ? resetProgress(p.canonical_id) : markAttempted(p.canonical_id, { roadmapProblem: true }))}
                          disabled={!!progressLocked}
                          title={progressLocked || (status === 'attempted' ? 'Click to unmark' : status === 'solved' ? 'Already solved - unmark it first' : 'Mark attempted')}
                        >~</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          );
        })}
      </div>
    </PageWrapper>
  );
}

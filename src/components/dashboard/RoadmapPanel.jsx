import Link from 'next/link';
import styles from '../../app/dashboard/Dashboard.module.css';

// Compact roadmap for the dashboard: every level as one small node (done / current / locked), then ONLY the current level in
// detail and the single next lock. Twelve full cards, mostly locked, were the old page's loudest and least useful block.
// `view` is lib/dashboardData.js roadmapView(). Author: Satvik Hemant Gupta
const STATE_WORD = { done: 'complete', current: 'in progress', open: 'open', locked: 'locked' };

export default function RoadmapPanel({ view }) {
  const { steps, overall, current, nextLock, allDone, notStarted } = view;
  if (steps.length === 0) return null;

  return (
    <div className={styles.roadmap}>
      <div className={styles.roadmapTop}>
        <span className={styles.roadmapOverall}>{overall.solved} of {overall.total} roadmap problems</span>
        <span className={styles.roadmapPct}>{overall.pct}%</span>
      </div>
      <div className={styles.bar} role="presentation"><div className={styles.barFill} style={{ '--pct': `${overall.pct}%` }} /></div>

      <ol className={styles.stepper} aria-label="Roadmap levels">
        {steps.map((s) => (
          <li key={s.level}>
            <Link
              href={`/roadmap/${s.level}`}
              className={styles.step}
              data-state={s.state}
              title={`Level ${s.level}: ${s.title} (${STATE_WORD[s.state]}, ${s.solved}/${s.total})`}
              aria-label={`Level ${s.level}, ${s.title}, ${STATE_WORD[s.state]}, ${s.solved} of ${s.total} solved`}
              aria-current={s.state === 'current' ? 'step' : undefined}
            >
              {s.state === 'done' ? <span aria-hidden="true">&#10003;</span> : s.level}
            </Link>
          </li>
        ))}
      </ol>

      {allDone && (
        <div className={styles.roadmapDone}>
          <strong>Roadmap complete.</strong>
          <span>Every level is done. Keep the streak going with the problem list.</span>
          <Link href="/problems" className={styles.textLink}>Browse all problems</Link>
        </div>
      )}

      {current && (
        <div className={styles.levelBlock}>
          <div className={styles.levelHead}>
            <div>
              <p className={styles.levelKicker}>{notStarted ? 'Start here' : 'You are on'} - Level {current.level}</p>
              <h3 className={styles.levelTitle}>{current.title}</h3>
            </div>
            <span className={styles.levelPct}>{current.pct}%</span>
          </div>

          <ul className={styles.topicList}>
            {current.topics.map((t) => (
              <li key={t.slug} className={styles.topicRow} data-done={t.done || undefined}>
                <span className={styles.topicName}>{t.name}</span>
                <span className={styles.topicCount}>{t.solved}/{t.total}</span>
                <div className={styles.bar} role="presentation"><div className={styles.barFill} style={{ '--pct': `${t.total ? Math.round((t.solved / t.total) * 100) : 0}%` }} /></div>
              </li>
            ))}
          </ul>

          <Link href={`/roadmap/${current.level}`} className={styles.primaryBtn}>
            {notStarted ? `Start Level ${current.level}` : current.nextTopic ? `Continue: ${current.nextTopic.name}` : `Open Level ${current.level}`}
          </Link>
          {nextLock && <p className={styles.lockHint}>Next, Level {nextLock.level} ({nextLock.title}): {nextLock.hint.replace(/ to unlock$/, ' to unlock it')}.</p>}
        </div>
      )}
    </div>
  );
}

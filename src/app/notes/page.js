import Link from 'next/link';
import { getNotesIndex } from '../../lib/server/content.server.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import { levelColorVar, levelBadgeLabel } from '../../lib/noteLevels.js';
import styles from './Notes.module.css';
import { routes, canonicalAlternates } from '../../lib/routeIdentity.js';

// ready/total come from getNotesIndex(), which counts the actual NOTES_TOPICS_INDEX entries against whichever files really exist under content/notes/ - add or remove topics/files and this is correct on the next build, nothing here is hand-typed.
export function generateMetadata() {
  const index = getNotesIndex();
  return {
    alternates: canonicalAlternates(routes.notes()),
    title: 'Notes',
    description: `In-depth study guides for ${index.total} major DSA topics, from foundations to advanced algorithms.`,
  };
}

export default function NotesPage() {
  const index = getNotesIndex();

  return (
    <PageWrapper className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>DSA Notes</h1>
        <p className={styles.subtitle}>
          In-depth study guides for every major DSA topic - from foundations to advanced algorithms.
          <span className={styles.progress}> {index.ready}/{index.total} available</span>
        </p>
      </div>

      {/* BUG-147/148/187: star level from the index, one explicit colour per level (levelColorVar throws instead of wrapping with %). */}
      {index.levels.map((level) => (
        <div key={level.level} className={styles.levelGroup}>
          <div className={styles.levelHeader}>
            <span
              className={styles.levelBadge}
              style={{
                background: `color-mix(in srgb, ${levelColorVar(level.level)} 13%, transparent)`,
                color: levelColorVar(level.level),
              }}
            >
              {levelBadgeLabel(level.level, index.starLevel)}
            </span>
            <h2 className={styles.levelName}>{level.name}</h2>
          </div>

          <div className={styles.topicsGrid}>
            {level.topics.map((topic) => (
              <TopicCard key={topic.slug} topic={topic} color={levelColorVar(level.level)} />
            ))}
          </div>
        </div>
      ))}
    </PageWrapper>
  );
}

function TopicCard({ topic, color }) {
  if (!topic.available) {
    return (
      <div className={styles.card} data-unavailable="true">
        <div className={styles.cardIcon} style={{ background: `color-mix(in srgb, ${color} 9%, transparent)`, color }}>◷</div>
        <div className={styles.cardBody}>
          <span className={styles.cardTitle}>{topic.topic}</span>
          <span className={styles.cardStatus}>Coming soon</span>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/notes/${topic.slug}`} className={styles.card}>
      <div className={styles.cardIcon} style={{ background: `color-mix(in srgb, ${color} 9%, transparent)`, color }}>◈</div>
      <div className={styles.cardBody}>
        <span className={styles.cardTitle}>{topic.topic}</span>
        <span className={styles.cardStatus} data-ready="true">Read →</span>
      </div>
    </Link>
  );
}

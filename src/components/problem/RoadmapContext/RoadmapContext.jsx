import Link from 'next/link';
import styles from './RoadmapContext.module.css';

// Point 5 of the data audit
export default function RoadmapContext({ context }) {
  if (!context) return null;
  const { levelName, level, position, total, prev, next } = context;

  return (
    <div className={styles.wrapper}>
      <div className={styles.breadcrumb}>
        <Link href={`/roadmap/${level}`} className={styles.breadcrumbLink}>{levelName}</Link>
        <span className={styles.sep}>{'\u203a'}</span>
        <span className={styles.position}>Step {position} of {total}</span>
      </div>

      {(prev || next) && (
        <div className={styles.nav}>
          {prev ? (
            <Link href={`/problems/${prev.slug}`} className={styles.navLink} data-dir="prev">
              <span className={styles.navArrow}>{'\u2190'}</span>
              <span className={styles.navText}>
                <span className={styles.navLabel}>Previous</span>
                {prev.title}
              </span>
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/problems/${next.slug}`} className={styles.navLink} data-dir="next">
              <span className={styles.navText}>
                <span className={styles.navLabel}>Next</span>
                {next.title}
              </span>
              <span className={styles.navArrow}>{'\u2192'}</span>
            </Link>
          ) : <span />}
        </div>
      )}
    </div>
  );
}

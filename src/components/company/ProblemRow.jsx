import Link from 'next/link';
import styles from '../../app/companies/[id]/CompanyDetail.module.css';
import { toExternalUrl } from '../../lib/urlPolicy.js';

const DIFFICULTY_CLASS = { EASY: 'diffEasy', MEDIUM: 'diffMedium', HARD: 'diffHard' };

function difficultyClass(difficulty) {
  if (!difficulty) return '';
  const key = difficulty.toUpperCase().split(' ')[0];
  return DIFFICULTY_CLASS[key] ? styles[DIFFICULTY_CLASS[key]] : '';
}

// BUG FIX: Atlas-linked rows now use next/link instead of a full-reload <a>; added a left accent bar keyed to confidenceTier.
export default function ProblemRow({ problem }) {
  const {
    title, atlasProblemId, atlasSlug, leetcodeSlug, difficulty,
    frequency, patterns, role, confidenceTier, source, sourceUrl, lastSeen,
  } = problem;

  const internalHref = atlasProblemId ? `/problems/${atlasSlug || atlasProblemId}` : null;
  const externalHref = !atlasProblemId && leetcodeSlug ? `https://leetcode.com/problems/${leetcodeSlug}/` : null;
  const safeSource = toExternalUrl(sourceUrl); // only http(s) data URLs become links
  const confidenceClass = confidenceTier === 'A' ? styles.rowVerified : styles.rowReported;

  return (
    <div className={`${styles.row} ${confidenceClass}`}>
      <div className={styles.rowMain}>
        {internalHref ? (
          <Link className={styles.rowTitle} href={internalHref}>{title}</Link>
        ) : externalHref ? (
          <a className={styles.rowTitle} href={externalHref} target="_blank" rel="noreferrer">{title}</a>
        ) : (
          <span className={`${styles.rowTitle} ${styles.rowTitleUnlinked}`}>{title}</span>
        )}
        {!atlasProblemId && (
          <span className={styles.unlinkedTag} title="Not yet matched to an Atlas problem">unlinked</span>
        )}
      </div>

      <div className={styles.rowMeta}>
        {difficulty && <span className={`${styles.diff} ${difficultyClass(difficulty)}`}>{difficulty}</span>}
        {role && <span className={styles.roleTag}>{role}</span>}
        <span className={`${styles.confidence} ${confidenceTier === 'A' ? styles.confidenceA : styles.confidenceB}`}>
          {confidenceTier === 'A' ? 'Verified' : 'Reported'}
        </span>
        {typeof frequency === 'number' && <span className={styles.frequency}>{frequency.toFixed(0)}% freq</span>}
        {lastSeen && <span className={styles.lastSeen}>seen {lastSeen}</span>}
      </div>

      {patterns && patterns.length > 0 && (
        <div className={styles.rowPatterns}>
          {patterns.map((p) => <span key={p} className={styles.patternPill}>{p}</span>)}
        </div>
      )}

      {source && (safeSource ? (
        <a className={styles.sourceBtn} href={safeSource} target="_blank" rel="noopener noreferrer" title={`Open the data source: ${safeSource}`}>
          <span className={styles.sourceBtnLabel}>Source</span> {source} &#8599;
        </a>
      ) : (
        <span className={`${styles.sourceBtn} ${styles.sourceBtnStatic}`} title="No public link for this source">
          <span className={styles.sourceBtnLabel}>Source</span> {source}
        </span>
      ))}
    </div>
  );
}

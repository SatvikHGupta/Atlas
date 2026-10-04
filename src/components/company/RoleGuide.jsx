import Link from 'next/link';
import { patternSlug } from '../../lib/patternSlug.js';
import styles from '../../app/companies/[id]/CompanyDetail.module.css';

export default function RoleGuide({ role, guidance }) {
  if (!guidance) return null;

  return (
    <div className={styles.roleGuide}>
      <div className={styles.roleGuideHead}>
        <h3>{role}</h3>
        <span className={styles.roleDepth}>{guidance.dsaDepth}</span>
      </div>

      <div className={styles.roleGuideBody}>
        <div>
          <span className={styles.roleLabel}>Rounds</span>
          <ol className={styles.roleRounds}>
            {guidance.rounds.map((r) => <li key={r}>{r}</li>)}
          </ol>
        </div>

        <div>
          <span className={styles.roleLabel}>Patterns to grind</span>
          <div className={styles.rolePatterns}>
            {guidance.focusPatterns.map((p) => (
              <Link key={p} href={`/patterns/${patternSlug(p)}`} className={styles.rolePatternChip}>
                {p}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <span className={styles.roleLabel}>Beyond DSA</span>
          <ul className={styles.roleExtras}>
            {guidance.extraTopics.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

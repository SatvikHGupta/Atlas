'use client';

import { nameHue } from '../../lib/nameHue.js';
import Link from 'next/link';
import styles from '../../app/patterns/PatternList.module.css';

// Cursor-follow spotlight (--mx/--my)
function handleMove(e) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

// `noteSlug` is the destination for the 📘 badge
export default function PatternCard({ pattern: p, maxCompanies, rank, noteSlug }) {
  const noSet = p.practiceCount === 0;
  const isFeatured = typeof rank === 'number';
  const hue = nameHue(p.pattern);
  const wash = isFeatured ? undefined : { background: `linear-gradient(160deg, hsl(${hue} 75% var(--hue-l) / 0.09), transparent 55%), var(--bg-card)` };
  const isPartial = p.totalProblemsInPool > p.practiceCount;

  return (
    <div
      onMouseMove={handleMove}
      style={wash}
      className={`${isFeatured ? styles.featuredCard : styles.card} ${noSet ? styles.cardNoSet : ''}`}
    >
      <Link href={`/patterns/${p.slug}`} className={styles.stretchedLink} aria-label={p.pattern} />
      {isFeatured && <span className={styles.rankBadge}>#{rank}</span>}
      {noteSlug && (
        <Link href={`/notes/${noteSlug}`} className={styles.noteBadge} title={`Read the ${p.pattern} note`}>
          &#128214;
        </Link>
      )}
      <span className={isFeatured ? styles.featuredName : styles.cardName}>{p.pattern}</span>
      <div className={styles.cardStat}>
        <span className={isFeatured ? styles.featuredStatValue : styles.cardStatValue}>{p.companiesSeenIn > 0 ? p.companiesSeenIn : p.totalProblemsInPool}</span>
        <span className={styles.cardStatLabel}>{p.companiesSeenIn === 0 ? 'problems carry this tag' : p.companiesSeenIn === 1 ? 'company asks this' : 'companies ask this'}</span>
      </div>
      <div className={styles.coverageTrack}>
        <div
          className={styles.coverageFill}
          style={{
            width: `${Math.max(6, (p.companiesSeenIn / maxCompanies) * 100)}%`,
            background: isFeatured ? undefined : `linear-gradient(90deg, hsl(${hue} 70% var(--hue-l)), hsl(${hue} 70% calc(var(--hue-l) + 12%)))`,
          }}
        />
      </div>
      <div className={noSet ? styles.cardFooterMuted : styles.cardFooter}>
        {noSet ? 'No practice set yet' : isPartial ? `${p.practiceCount} of ${p.totalProblemsInPool} to practice` : `${p.practiceCount} to practice`}
      </div>
    </div>
  );
}

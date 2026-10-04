'use client';

import { useState } from 'react';
import Link from 'next/link';
import CompanyChipRow from '../company/CompanyChipRow.jsx';
import styles from './FlashCard.module.css';

const DIFF_CLASS = { Easy: 'diffEasy', Medium: 'diffMedium', Hard: 'diffHard' };

// One card per practice problem in a note's "problems" section. Front is deliberately just the
// title + difficulty - no hint - so it works as an actual recall prompt ("could I solve this
// blind?") before flipping to see the approach. `why` is the hand-written per-problem insight
// already in the note data; `companies` comes from the problem's own content bundle (askedAt),
// resolved server-side and passed in - this component stays presentational.
export default function FlashCard({ title, slug, difficultyLabel, why, href, companies }) {
  const [flipped, setFlipped] = useState(false);
  const diffKey = DIFF_CLASS[difficultyLabel] || '';

  return (
    <div className={`${styles.card} ${flipped ? styles.flipped : ''}`}>
      <button
        type="button"
        className={styles.inner}
        onClick={() => setFlipped((f) => !f)}
        aria-pressed={flipped}
        aria-label={`${title} flashcard - click to ${flipped ? 'show question' : 'reveal approach'}`}
      >
        <div className={styles.face}>
          <span className={`${styles.diffPill} ${diffKey ? styles[diffKey] : ''}`}>{difficultyLabel}</span>
          <span className={styles.frontTitle}>{title}</span>
          <span className={styles.flipHint}>Tap to reveal approach ↻</span>
        </div>

        <div className={`${styles.face} ${styles.back}`}>
          <p className={styles.why}>{why}</p>
        </div>
      </button>

      {flipped && (
        <div className={styles.footer} onClick={(e) => e.stopPropagation()}>
          <CompanyChipRow companies={companies} />
          <Link href={href} className={styles.solveLink}>Solve it &rarr;</Link>
        </div>
      )}
    </div>
  );
}

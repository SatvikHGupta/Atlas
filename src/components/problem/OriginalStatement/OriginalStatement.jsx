'use client';

import { useState } from 'react';
import styles from './OriginalStatement.module.css';

/* Point 2 of the data audit, resolved as a deliberate design choice rather than a straightforward
   "add it" fix: description (91% coverage) and constraints (91%) are fully loaded on every page and
   never shown - only Atlas's own explanation_short/explanation_long ever render. Two real reads on
   that: Atlas's explanation might be meant to REPLACE the original phrasing (showing the raw text
   undermines that), or it might be a gap - interview prep specifically benefits from practicing on
   problems exactly as they're actually phrased, not a paraphrase. This threads both: closed by
   default so it never competes with or duplicates the Explanation section, but one click away for
   someone who wants it. `client` only because of the open/close toggle - the content itself is
   static, already in the page's HTML either way (no fetch on expand). */
export default function OriginalStatement({ description, constraints }) {
  const [open, setOpen] = useState(false);
  if (!description && !constraints) return null;

  // constraints arrive as one string with embedded newlines, one bound per line - rendering as a
  // list reads far better than a wall of text for something inherently itemized
  const constraintLines = constraints?.split('\n').map((l) => l.trim()).filter(Boolean) || [];

  return (
    <section className={styles.section}>
      <button className={styles.toggle} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <svg className={styles.chevron} data-open={open} viewBox="0 0 12 12" width="10" height="10">
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Original problem statement
      </button>

      {open && (
        <div className={styles.content}>
          {description && <p className={styles.description}>{description}</p>}
          {constraintLines.length > 0 && (
            <div className={styles.constraints}>
              <h3 className={styles.constraintsTitle}>Constraints</h3>
              <ul className={styles.constraintsList}>
                {constraintLines.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

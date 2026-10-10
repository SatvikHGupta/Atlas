'use client';

import { useState } from 'react';
import styles from './OriginalStatement.module.css';

// Point 2 of the data audit, resolved as a deliberate design choice rather
export default function OriginalStatement({ description, constraints }) {
  const [open, setOpen] = useState(false);
  if (!description && !constraints) return null;

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

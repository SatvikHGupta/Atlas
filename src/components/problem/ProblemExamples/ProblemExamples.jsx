'use client';

import { useState } from 'react';
import styles from './ProblemExamples.module.css';

export default function ProblemExamples({ examples }) {
  const [open, setOpen] = useState(false);
  if (!examples?.length) return null;

  return (
    <section className={styles.dropdown}>
      <button className={styles.toggle} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <svg className={styles.chevron} data-open={open} viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Examples ({examples.length})
      </button>

      {open && (
        <div className={styles.list}>
          {examples.map((ex, i) => (
            <div key={i} className={styles.example}>
              <span className={styles.exampleLabel}>Example {i + 1}</span>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Input</span>
                <code className={styles.code}>{ex.input}</code>
              </div>
              <div className={styles.row}>
                <span className={styles.rowLabel}>Output</span>
                <code className={styles.code}>{ex.output}</code>
              </div>
              {ex.explanation && <p className={styles.explanation}>{ex.explanation}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

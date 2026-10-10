'use client';

import Link from 'next/link';
import styles from './not-found.module.css';

// route-level error boundary
export default function RouteError({ error, reset }) {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <span className={styles.code}>Oops</span>
        <h1 className={styles.title}>Something went wrong on this page.</h1>
        <p className={styles.sub}>
          {error?.digest ? `Reference: ${error.digest}. ` : ''}Your progress is safe. Try again, or go back to the problems.
        </p>
        <button type="button" className={styles.homeBtn} onClick={() => reset()}>Try again</button>
        <Link href="/problems" className={styles.homeBtn}>Back to Problems</Link>
      </div>
    </div>
  );
}

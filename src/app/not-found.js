import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <span className={styles.code}>404</span>
        <h1 className={styles.title}>Page not found.</h1>
        <p className={styles.sub}>This route doesn&apos;t exist. Wrong problem set?</p>
        <Link href="/problems" className={styles.homeBtn}>Back to Problems →</Link>
      </div>
    </div>
  );
}

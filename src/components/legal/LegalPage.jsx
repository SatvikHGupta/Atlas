import styles from './LegalPage.module.css';

// Shared shell for /privacy and /terms. Plain server component, no client JS.
export default function LegalPage({ title, updated, children }) {
  return (
    <article className={styles.page}>
      <h1>{title}</h1>
      <p className={styles.updated}>Last updated: {updated}</p>
      {children}
    </article>
  );
}

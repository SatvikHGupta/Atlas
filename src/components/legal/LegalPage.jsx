import styles from './LegalPage.module.css';
import BackButton from '../ui/BackButton/BackButton.jsx';

// Shared shell for /privacy and /terms
export default function LegalPage({ title, updated, children }) {
  return (
    <article className={styles.page}>
      <BackButton fallback="/settings" />
      <h1>{title}</h1>
      {updated && <p className={styles.updated}>Last updated: {updated}</p>}
      {children}
    </article>
  );
}

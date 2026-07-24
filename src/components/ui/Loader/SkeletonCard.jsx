import styles from './Loader.module.css';

export default function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.titleLine} />
      <div className={styles.metaRow}>
        <div className={styles.badge} />
        <div className={styles.tag} />
        <div className={styles.tag} />
      </div>
      <div className={styles.companyRow}>
        <div className={styles.company} />
        <div className={styles.company} />
        <div className={styles.company} />
      </div>
    </div>
  );
}

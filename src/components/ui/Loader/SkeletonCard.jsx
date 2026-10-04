import styles from './Loader.module.css';

// BUG-027: only uses classes that exist in Loader.module.css
export default function SkeletonCard() {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <div className={styles.skeletonLine} data-width="80" />
      <div className={styles.skeletonLine} data-width="40" />
      <div className={styles.skeletonLine} data-width="60" />
    </div>
  );
}

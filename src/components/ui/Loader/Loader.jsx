import styles from './Loader.module.css';

export function SkeletonDetail() {
  return (
    <div className={styles.detail}>
      <div className={styles.detailTitle} />
      <div className={styles.detailMeta} />
      <div className={styles.detailBlock} />
      <div className={styles.detailBlock} style={{ height: 200 }} />
      <div className={styles.detailBlock} style={{ height: 280 }} />
    </div>
  );
}

export function Loader({ size = 24 }) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size }}
      aria-label="loading"
    />
  );
}

export function FullPageLoader() {
  return (
    <div className={styles.fullPage}>
      <Loader size={36} />
    </div>
  );
}

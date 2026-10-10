import styles from './Loader.module.css';

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

import styles from './RedirectButton.module.css';

export default function RedirectButton({ platforms }) {
  if (!platforms?.length) return null;

  const primary = platforms.find((p) => p.platform === 'leetcode') || platforms[0];
  if (!primary?.url) return null;

  return (
    <div className={styles.wrapper}>
      <a
        href={primary.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.primaryBtn}
      >
        Solve ↗
      </a>

      {platforms.length > 1 && (
        <div className={styles.others}>
          {platforms.slice(1, 4).map((p) =>
            p.url ? (
              <a
                key={p.platform}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.altBtn}
              >
                ↗
              </a>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

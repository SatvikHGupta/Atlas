'use client';

import styles from './ThemeCard.module.css';

// Mini app preview painted with a given mode + accent palette (not the active theme), so a light card is visibly light
// and a Meadow card is visibly green. Pure decoration, hidden from assistive tech - the name text carries the meaning.
function Preview({ palette }) {
  const vars = {
    '--p-bg': palette.bg,
    '--p-card': palette.card,
    '--p-elevated': palette.elevated,
    '--p-text': palette.text,
    '--p-muted': palette.muted,
    '--p-accent': palette.accent,
    '--p-accent2': palette.partner,
    '--p-solved': palette.solved,
    '--p-code': palette.codeBg,
  };
  return (
    <span className={styles.preview} style={vars} aria-hidden="true">
      <span className={styles.pNav}>
        <i className={styles.pLogo} />
        <i className={`${styles.pPill} ${styles.pPillActive}`} />
        <i className={styles.pPill} />
        <i className={styles.pPill} />
      </span>
      <span className={styles.pBody}>
        <span className={styles.pCard}>
          <i className={styles.pTitle} />
          <i className={styles.pLine} />
          <i className={`${styles.pLine} ${styles.pLineShort}`} />
          <i className={styles.pBar} />
          <i className={styles.pCode} />
          <span className={styles.pRow}>
            <i className={`${styles.pChip} ${styles.pChipSolved}`} />
            <i className={`${styles.pChip} ${styles.pChipAccent}`} />
            <i className={styles.pBtn} />
          </span>
        </span>
      </span>
    </span>
  );
}

// One selectable card. `palette` comes from getThemePreview(mode, accent); `swatch` shows the two accent dots.
export default function ThemeCard({ name, description, palette, active, onSelect, swatch = true }) {
  return (
    <button
      type="button"
      className={`${styles.card} ${active ? styles.active : ''}`}
      onClick={onSelect}
      aria-pressed={active}
    >
      <Preview palette={palette} />

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{name}</span>
          {swatch && (
            <span className={styles.accentDots} aria-hidden="true">
              <i style={{ background: palette.accent }} />
              <i style={{ background: palette.accentLight }} />
            </span>
          )}
        </div>
        <p className={styles.description}>{description}</p>
      </div>

      {active && (
        <span className={styles.check} aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" fill={palette.accent} />
            <path d="M5 8.3 7.1 10.4 11 6" stroke={palette.accentFg} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
}

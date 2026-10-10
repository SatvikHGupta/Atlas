import { RATING_BANDS } from '../../../lib/codeforces.utils.js';
import styles from './RatingBandFilter.module.css';

// Multi-select: `active` is an array of band keys
export default function RatingBandFilter({ active = [], onChange }) {
  const toggle = (key) => onChange(active.includes(key) ? active.filter((k) => k !== key) : [...active, key]);
  return (
    <div className={styles.row}>
      {RATING_BANDS.map((band) => (
        <button
          key={band.key}
          className={styles.chip}
          data-active={active.includes(band.key)}
          aria-pressed={active.includes(band.key)}
          style={{ '--band-color': band.color }}
          onClick={() => toggle(band.key)}
        >
          <span className={styles.dot} />
          {band.label}
        </button>
      ))}
    </div>
  );
}

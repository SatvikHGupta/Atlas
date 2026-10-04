import { RATING_BANDS } from '../../../lib/codeforces.utils.js';
import styles from './RatingBandFilter.module.css';

// Single-select, like the existing status chips - clicking the active one clears it. Unlike topics
// (where "Graphs AND DP" is a normal ask), picking two disjoint rating bands at once isn't a
// meaningful combination, so this stays one-at-a-time rather than a multi-select.
export default function RatingBandFilter({ active, onChange }) {
  return (
    <div className={styles.row}>
      {RATING_BANDS.map((band) => (
        <button
          key={band.key}
          className={styles.chip}
          data-active={active === band.key}
          aria-pressed={active === band.key}
          style={{ '--band-color': band.color }}
          onClick={() => onChange(active === band.key ? null : band.key)}
        >
          <span className={styles.dot} />
          {band.label}
        </button>
      ))}
    </div>
  );
}

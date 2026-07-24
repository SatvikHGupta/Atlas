import { SORT_OPTIONS } from '../../../constants/topics.js';
import styles from './SortDropdown.module.css';

export default function SortDropdown({ value, onChange }) {
  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>Sort by</label>
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

import { useId } from 'react';
import { SORT_OPTIONS } from '../../../constants/topics.js';
import styles from './SortDropdown.module.css';

export default function SortDropdown({ value, onChange }) {
  const id = useId(); // label was not tied to the select
  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor={id}>Sort by</label>
      <select
        id={id}
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

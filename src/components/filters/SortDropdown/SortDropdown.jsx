import { useId } from 'react';
import { SORT_OPTIONS } from '../../../constants/topics.js';
import ResponsiveSelect from '../../ui/Dropdown/ResponsiveSelect.jsx';
import styles from './SortDropdown.module.css';

export default function SortDropdown({ value, onChange }) {
  const id = useId();
  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor={id}>Sort by</label>
      <ResponsiveSelect
        id={id}
        nativeClassName={styles.select}
        phoneClassName={styles.phoneDrop}
        ariaLabel="Sort by"
        value={value}
        onChange={onChange}
        options={SORT_OPTIONS}
      />
    </div>
  );
}

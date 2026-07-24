import { useState } from 'react';
import { useDebounce } from '../../../hooks/useFilters.js';
import { useFilterStore } from '../../../store/filter.store.js';
import { useEffect } from 'react';
import styles from './SearchBar.module.css';

export default function SearchBar() {
  const [value, setValue] = useState('');
  const debounced = useDebounce(value, 400);
  const setFilter = useFilterStore((s) => s.setFilter);

  useEffect(() => {
    setFilter('search', debounced);
  }, [debounced, setFilter]);

  return (
    <div className={styles.wrapper}>
      <span className={styles.icon}>⌕</span>
      <input
        className={styles.input}
        type="text"
        placeholder="Search problems..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <button className={styles.clear} onClick={() => { setValue(''); setFilter('search', ''); }}>
          ×
        </button>
      )}
    </div>
  );
}

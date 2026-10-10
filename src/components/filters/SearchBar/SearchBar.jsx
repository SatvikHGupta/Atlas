'use client';

import { useEffect, useReducer, useRef } from 'react';
import { useFilterStore } from '../../../store/filter.store.js';
import {
  initialSearchState, searchReducer, inputValue, needsCommit,
} from '../../../lib/searchSync.js';
import styles from './SearchBar.module.css';

const COMMIT_MS = 350;

// the filter store's `search` is the single source of truth
export default function SearchBar() {
  const storeValue = useFilterStore((s) => s.filters.search);
  const setFilter = useFilterStore((s) => s.setFilter);
  const [state, dispatch] = useReducer(searchReducer, initialSearchState);
  const timerRef = useRef(null);

  useEffect(() => {
    dispatch({ type: 'storeChanged', value: storeValue });
  }, [storeValue]);

  useEffect(() => {
    if (!needsCommit(state, storeValue)) return undefined;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dispatch({ type: 'commit' });
      setFilter('search', state.draft);
    }, COMMIT_MS);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.draft]);

  const value = inputValue(state, storeValue);

  const handleClear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    dispatch({ type: 'clear' });
    setFilter('search', '');
  };

  return (
    <div className={styles.wrapper}>
      <span className={styles.icon}>⌕</span>
      <input
        className={styles.input}
        type="text"
        placeholder="Search problems..."
        value={value}
        onChange={(e) => dispatch({ type: 'type', value: e.target.value })}
      />
      {value && (
        <button type="button" className={styles.clear} onClick={handleClear} aria-label="Clear search">
          ×
        </button>
      )}
    </div>
  );
}

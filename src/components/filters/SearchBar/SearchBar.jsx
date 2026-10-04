'use client';

import { useEffect, useReducer, useRef } from 'react';
import { useFilterStore } from '../../../store/filter.store.js';
import {
  initialSearchState, searchReducer, inputValue, needsCommit,
} from '../../../lib/searchSync.js';
import styles from './SearchBar.module.css';

const COMMIT_MS = 350;

/* BUG-099/100/101: the filter store's `search` is the single source of
   truth. This component keeps a local "draft" only while the user is
   actively typing, and re-syncs from the store whenever it changes from
   outside (Clear filters, URL init, reset, the other SearchBar instance).
   Both the desktop and mobile bars are separate mounts of this same
   component, bound to the same store value, so they cannot drift. */
export default function SearchBar() {
  const storeValue = useFilterStore((s) => s.filters.search);
  const setFilter = useFilterStore((s) => s.setFilter);
  const [state, dispatch] = useReducer(searchReducer, initialSearchState);
  const timerRef = useRef(null);

  // BUG-099: re-sync when the store changes from outside this instance
  // (including on mount, so a persisted value shows immediately).
  useEffect(() => {
    dispatch({ type: 'storeChanged', value: storeValue });
  }, [storeValue]);

  // BUG-100: debounce the write, and always clear the previous timer so a
  // stale commit can never fire after a reset/clear.
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

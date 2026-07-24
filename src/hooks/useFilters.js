import { useFilterStore } from '../store/filter.store.js';
import { useEffect, useState } from 'react';

export const useFilters = () => {
  const { filters, setFilter, resetFilters, setPage } = useFilterStore();
  return { filters, setFilter, resetFilters, setPage };
};

export const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

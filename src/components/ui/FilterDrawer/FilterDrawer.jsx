'use client';

// DSA filters as a phone sheet
import BottomSheet from '../BottomSheet/BottomSheet.jsx';
import FilterBar from '../../filters/FilterBar/FilterBar.jsx';
import { useFilters } from '../../../hooks/useFilters.js';

// closeOnBack is off here because these filters write to the URL, and a Back would undo them
export default function FilterDrawer({ open, onClose }) {
  const { filters, resetFilters } = useFilters();
  // same count the desktop sidebar uses for its "Clear N" button
  const activeCount = [filters.topics?.length ? 1 : 0, filters.difficulty, filters.status].filter(Boolean).length;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filters"
      closeOnBack={false}
      onClear={resetFilters}
      clearDisabled={activeCount === 0}
    >
      <FilterBar inDrawer />
    </BottomSheet>
  );
}

import { useState, useMemo } from 'react';
import { useProblems } from '../../hooks/useProblems.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useFilters } from '../../hooks/useFilters.js';
import { useProgress } from '../../hooks/useProgress.js';
import { useBookmarks } from '../../hooks/useBookmarks.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import FilterBar from '../../components/filters/FilterBar/FilterBar.jsx';
import FilterDrawer from '../../components/ui/FilterDrawer/FilterDrawer.jsx';
import SearchBar from '../../components/filters/SearchBar/SearchBar.jsx';
import ProblemList from '../../components/problem/ProblemList/ProblemList.jsx';
import styles from './Problems.module.css';

export default function Problems() {
  usePageTitle('DSA Problems');
  const { filters, setPage } = useFilters();
  const { progressMap, progressList, isLoading: progressLoading } = useProgress();
  const { bookmarkedIds, isLoading: bookmarksLoading } = useBookmarks();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const status = filters.status;

  // exact counts from already-loaded small payloads
  const solvedCount    = useMemo(() => progressList.filter(p => p.status === 'solved').length,    [progressList]);
  const attemptedCount = useMemo(() => progressList.filter(p => p.status === 'attempted').length, [progressList]);
  const touchedIds     = useMemo(() => new Set(Object.keys(progressMap)), [progressMap]);

  const { data, isLoading: problemsLoading, isError } = useProblems({});

  const allProblems  = data?.data?.problems || [];
  const backendTotal = data?.data?.total    || 0;

  let displayProblems;
  let displayTotal;

  if (!status) {
    displayProblems = allProblems;
    displayTotal    = backendTotal;
  } else if (status === 'unsolved') {
    displayProblems = allProblems.filter(p => !touchedIds.has(p.canonical_id));
    displayTotal    = Math.max(0, backendTotal - touchedIds.size);
  } else if (status === 'solved') {
    displayProblems = allProblems.filter(p => progressMap[p.canonical_id] === 'solved');
    displayTotal    = solvedCount;
  } else if (status === 'attempted') {
    displayProblems = allProblems.filter(p => progressMap[p.canonical_id] === 'attempted');
    displayTotal    = attemptedCount;
  } else if (status === 'bookmarked') {
    displayProblems = allProblems.filter(p => bookmarkedIds.has(p.canonical_id));
    displayTotal    = bookmarkedIds.size;
  }

  const isLoading = problemsLoading || progressLoading || bookmarksLoading;

  const activeCount = [
    filters.topic, filters.pattern, filters.difficulty, filters.status,
  ].filter(Boolean).length;

  return (
    <>
      <div className={styles.mobileTopBar}>
        <div className={styles.mobileSearch}><SearchBar /></div>
        <button
          className={styles.filterBtn}
          data-active={activeCount > 0 || drawerOpen}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open filters"
        >
          ⊟ Filters{activeCount > 0 && <span className={styles.filterCount}>{activeCount}</span>}
        </button>
      </div>

      <div className={styles.layout}>
        <FilterBar />

        <PageWrapper className={styles.content}>
          {isError ? (
            <div className={styles.errorState}>
              <span className={styles.errorIcon}>⚠</span>
              <h3>Couldn't load problems</h3>
              <p>The backend may be down. Make sure <code>npm run dev</code> is running.</p>
            </div>
          ) : (
            <ProblemList
              problems={displayProblems}
              isLoading={isLoading}
              total={displayTotal}
              page={filters.page}
              limit={filters.limit || 50}
              onPageChange={setPage}
            />
          )}
        </PageWrapper>
      </div>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

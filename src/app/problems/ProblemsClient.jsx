'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDsaIndex } from '../../hooks/useProblems.js';
import { useFilters, useFiltersHydrated } from '../../hooks/useFilters.js';
import { useProgress } from '../../hooks/useProgress.js';
import { useBookmarks } from '../../hooks/useBookmarks.js';
import { applyFilters, applyStatusFilter, applySort, clampPage } from '../../lib/problems.filter.js';
import { parseFilterParams, mergeFilterQuery } from '../../lib/filterUrl.js';
import { personalGate } from '../../lib/resourceState.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import FilterBar from '../../components/filters/FilterBar/FilterBar.jsx';
import FilterDrawer from '../../components/ui/FilterDrawer/FilterDrawer.jsx';
import SearchBar from '../../components/filters/SearchBar/SearchBar.jsx';
import ProblemList from '../../components/problem/ProblemList/ProblemList.jsx';
import styles from './Problems.module.css';

/* BUG FIX (was: pagination-before-status-filter in the old Vite app - see lib/problems.filter.js's doc comment for the full story). The whole DSA slim index loads once here (~250KB gzip, cached by react-query - see useDsaIndex), then filters run in this exact order on the FULL array: metadata filters -> status filter (needs progressMap/bookmarkedIds, which is why it can't be baked into the static page) -> sort -> slice for the current page. There is no "ask a backend for page N" step to get out of order with the status filter, because there's no backend call at all - the fix is architectural, not a patched condition. */
export default function ProblemsClient() {
  const { filters, setPage, patchFilters } = useFilters();
  const { progressMap, state: progressState, retry: retryProgress } = useProgress();
  const { bookmarkedIds, state: bookmarksState, retry: retryBookmarks } = useBookmarks();
  const { data: allProblems, isLoading: indexLoading, isError } = useDsaIndex();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydrated = useFiltersHydrated();
  const appliedUrlRef = useRef(false);

  // BUG-105: initialise from the URL first, then sessionStorage. We wait for
  // sessionStorage rehydration to finish so the URL always wins over it, and
  // only do this once per page load.
  useEffect(() => {
    if (!hydrated || appliedUrlRef.current) return;
    appliedUrlRef.current = true;
    const fromUrl = parseFilterParams(searchParams);
    if (Object.keys(fromUrl).length > 0) patchFilters(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Mirror the shareable filters into the URL with router.replace (no
  // history spam). Status is never written to the URL.
  useEffect(() => {
    if (!appliedUrlRef.current) return; // wait for the initial URL read above
    const query = mergeFilterQuery(searchParams, filters);
    const next = query ? `${pathname}?${query}` : pathname;
    const current = searchParams.toString();
    const currentUrl = current ? `${pathname}?${current}` : pathname;
    if (next !== currentUrl) router.replace(next, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.topic, filters.pattern, filters.difficulty, filters.sort, filters.page]);

  const limit = filters.limit || 50;

  // BUG-191: personal state only blocks the list when a status/bookmark
  // filter is actually active - the public list renders as soon as the
  // index is ready.
  // ATLAS-BUG-002: loading and FAILED are different. A failed read must not run the status filter against an empty map
  // (that makes "Unsolved" return everything and "Solved" return nothing).
  const gate = personalGate(filters.status, progressState, bookmarksState);
  const personalFailed = gate === 'failed';
  const isLoading = indexLoading || gate === 'loading';
  const retryPersonal = () => { retryProgress?.(); retryBookmarks?.(); };

  const { pageItems, total, page } = useMemo(() => {
    if (!allProblems) return { pageItems: [], total: 0, page: 1 };

    let list = applyFilters(allProblems, { ...filters, mode: 'dsa' });
    if (!personalFailed) list = applyStatusFilter(list, filters.status, progressMap, bookmarkedIds);
    list = applySort(list, filters.sort);

    const total = list.length;
    // BUG-104: clamp so a filter/progress change can never strand the user
    // on a now-empty page.
    const clamped = clampPage(filters.page, total, limit);
    const offset = (clamped - 1) * limit;
    return { pageItems: list.slice(offset, offset + limit), total, page: clamped };
  }, [allProblems, filters, progressMap, bookmarkedIds, limit, personalFailed]);

  useEffect(() => {
    if (page !== filters.page) setPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const activeCount = [filters.topic, filters.pattern, filters.difficulty, filters.status].filter(Boolean).length;

  return (
    <>
      <div className={styles.mobileTopBar}>
        <div className={styles.mobileSearch}><SearchBar /></div>
        <button
          type="button"
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
          {personalFailed && !isError && (
            <div className={styles.errorState} role="alert">
              <span className={styles.errorIcon}>⚠</span>
              <h3>Couldn&apos;t load your progress</h3>
              <p>The status filter needs it, so it is paused instead of showing wrong results.</p>
              <button type="button" onClick={retryPersonal}>Retry</button>
            </div>
          )}
          {isError ? (
            <div className={styles.errorState}>
              <span className={styles.errorIcon}>⚠</span>
              <h3>Couldn&apos;t load problems</h3>
              <p>Try refreshing the page.</p>
            </div>
          ) : (
            <ProblemList
              problems={pageItems}
              isLoading={isLoading}
              total={total}
              page={page}
              limit={limit}
              onPageChange={setPage}
            />
          )}
        </PageWrapper>
      </div>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

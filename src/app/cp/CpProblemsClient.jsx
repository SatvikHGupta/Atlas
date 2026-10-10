'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useCpIndex } from '../../hooks/useProblems.js';
import { useProgress } from '../../hooks/useProgress.js';
import { useBookmarks } from '../../hooks/useBookmarks.js';
import { personalGate } from '../../lib/resourceState.js';
import { applyStatusFilter } from '../../lib/problems.filter.js';
import { matchesRatingBands, matchesCpSearch, getCpCodes, filterByTopics } from '../../lib/codeforces.utils.js';
import { getDisplayRating } from '../../lib/cpRating.js';
import { getCfUrl } from '../../lib/codeforces.utils.js';
import BottomSheet from '../../components/ui/BottomSheet/BottomSheet.jsx';
import Dropdown from '../../components/ui/Dropdown/Dropdown.jsx';
import { useUIStore } from '../../store/ui.store.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import TopicFilter from '../../components/cp/TopicFilter/TopicFilter.jsx';
import RatingBandFilter from '../../components/cp/RatingBandFilter/RatingBandFilter.jsx';
import CpProblemRow from '../../components/cp/CpProblemRow/CpProblemRow.jsx';
import styles from './CpProblems.module.css';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

const SORT_OPTIONS = [
  { value: 'frequency',    label: 'Most popular' },
  { value: 'rating_asc',   label: 'Rating \u2191' },
  { value: 'rating_desc',  label: 'Rating \u2193' },
  { value: 'title_asc',    label: 'A \u2192 Z' },
];

const STATUS_FILTERS = [
  { val: 'solved', label: 'Solved' },
  { val: 'attempted', label: 'Attempted' },
  { val: 'unsolved', label: 'Unsolved' },
  { val: 'bookmarked', label: 'Bookmarked' },
];

// CP-specific sort - deliberately NOT the shared applySort's
function sortCpProblems(list, sort) {
  const arr = [...list];
  switch (sort) {
    case 'rating_asc':  return arr.sort((a, b) => (a._cfRating ?? Infinity) - (b._cfRating ?? Infinity));
    case 'rating_desc': return arr.sort((a, b) => (b._cfRating ?? -Infinity) - (a._cfRating ?? -Infinity));
    case 'title_asc':   return arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    case 'frequency':
    default:             return arr.sort((a, b) => (b.frequency_score || 0) - (a.frequency_score || 0));
  }
}

export default function CpProblemsClient() {
  const [page, setPage] = useState(1);
  const [jumpValue, setJumpValue] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ratingBands, setRatingBands] = useState([]);
  const [sort, setSort] = useState('frequency');

  const { data: allProblems, isLoading, isError, refetch } = useCpIndex();
  const { progressList, progressMap, markSolved, markAttempted, resetProgress, state: progressState, degraded: progressDegraded, retry: retryProgress } = useProgress();
  const { bookmarkedIds, toggleBookmark, state: bookmarksState, degraded: bookmarksDegraded, retry: retryBookmarks } = useBookmarks();

  const lockReason = (state, degraded, what) => {
    if (state === 'loading') return `Loading your ${what}...`;
    if (state === 'failed') return `Couldn't load your ${what} - use Retry`;
    if (degraded) return 'Service temporarily limited - resets at midnight PT';
    return null;
  };
  const progressLocked = lockReason(progressState, progressDegraded, 'progress');
  const bookmarksLocked = lockReason(bookmarksState, bookmarksDegraded, 'bookmarks');
  const personalGateState = personalGate(statusFilter, progressState, bookmarksState);
  const personalFailed = personalGateState === 'failed';
  const retryPersonal = () => { if (progressState === 'failed') retryProgress?.(); if (bookmarksState === 'failed') retryBookmarks?.(); };

  const problemsWithRating = useMemo(() => {
    if (!allProblems) return [];
    return allProblems.map((p) => ({
      ...p,
      _cfRating: getDisplayRating(p),
      _titleLower: (p.title || '').toLowerCase(),
      _codes: getCpCodes(p),
    }));
  }, [allProblems]);

  useEffect(() => {
    const id = setTimeout(() => { setSearch(searchInput); setPage(1); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput]);

  const solveCountById = useMemo(() => {
    const map = {};
    for (const entry of progressList) map[entry.canonical_id] = entry.solve_count || 0;
    return map;
  }, [progressList]);

  const searchFiltered = useMemo(() => {
    if (!search.trim()) return problemsWithRating;
    return problemsWithRating.filter((p) => matchesCpSearch(p, search));
  }, [problemsWithRating, search]);

  const filteredWithoutRating = useMemo(() => {
    let list = filterByTopics(searchFiltered, selectedTopics);
    if (personalGateState === 'ok') list = applyStatusFilter(list, statusFilter, progressMap, bookmarkedIds);
    return list;
  }, [searchFiltered, selectedTopics, statusFilter, progressMap, bookmarkedIds, personalGateState]);

  const visibleProblems = useMemo(() => {
    const list = filteredWithoutRating.filter((p) => matchesRatingBands(p._cfRating, ratingBands));
    return sortCpProblems(list, sort);
  }, [filteredWithoutRating, ratingBands, sort]);

  const addToast = useUIStore((s) => s.addToast);

  const openRandom = () => {
    if (visibleProblems.length === 0) { addToast('No problems match to pick from', 'error'); return; }
    const pick = visibleProblems[Math.floor(Math.random() * visibleProblems.length)];
    const url = getCfUrl(pick);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); a.remove();
  };

  const total = visibleProblems.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const offset = (currentPage - 1) * PAGE_SIZE;
    return visibleProblems.slice(offset, offset + PAGE_SIZE);
  }, [visibleProblems, currentPage]);

  const chipLocked = (val) => (val === 'bookmarked' ? bookmarksLocked : progressLocked);

  const resetToFirstPage = () => setPage(1);
  const handleSetStatus = (val) => { setStatusFilter((s) => (s === val ? '' : val)); resetToFirstPage(); };
  const handleTopics = (val) => { setSelectedTopics(val); resetToFirstPage(); };
  const handleRatingBand = (val) => { setRatingBands(val); resetToFirstPage(); };
  const anyFilter = selectedTopics.length > 0 || ratingBands.length > 0 || statusFilter !== '';
  const filterCount = selectedTopics.length + ratingBands.length + (statusFilter ? 1 : 0);
  const clearAll = () => { setSelectedTopics([]); setRatingBands([]); setStatusFilter(''); resetToFirstPage(); };

  const commitJump = () => {
    const n = parseInt(jumpValue, 10);
    if (Number.isFinite(n) && n >= 1 && n <= totalPages) setPage(n);
    setJumpValue('');
  };

  const randomBtn = (
    <button type="button" className={styles.randomBtn} onClick={openRandom} title="Open a random CP problem from the current filters">
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 4.5h2.2c1.6 0 2.5.8 3.4 2.2l1.1 1.6c.9 1.4 1.8 2.2 3.4 2.2H14M2 11.5h2.2c1 0 1.7-.3 2.3-.9M14 4.5h-1.9c-1 0-1.7.3-2.3.9M12.5 2.5 14.5 4.5l-2 2M12.5 9.5l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Random
    </button>
  );

  const sortSelect = (
    <select className={styles.sortSelect} aria-label="Sort problems" value={sort} onChange={(e) => { setSort(e.target.value); resetToFirstPage(); }}>
      {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const filterPanel = (
    <div className={styles.filterPanel}>
      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>Topics</span>
        <div className={styles.groupBody}>
          <div className={styles.topicRow}>
            <TopicFilter allProblems={problemsWithRating} selected={selectedTopics} onChange={handleTopics} />
            <span className={styles.clearSlot}>
              {anyFilter && (
                <button type="button" className={styles.clearAll} onClick={clearAll} title="Clear all filters" aria-label="Clear all filters">
                  <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </button>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>Rating</span>
        <div className={styles.groupBody}>
          <RatingBandFilter active={ratingBands} onChange={handleRatingBand} />
        </div>
      </div>

      <div className={styles.filterGroup}>
        <span className={styles.groupLabel}>My progress</span>
        <div className={styles.groupBody}>
          <div className={styles.progressRow}>
            <div className={styles.statusChips}>
              {STATUS_FILTERS.map(({ val, label }) => (
                <button
                  key={val}
                  className={styles.statusChip}
                  data-val={val}
                  data-active={statusFilter === val}
                  onClick={() => handleSetStatus(val)}
                  disabled={chipLocked(val)}
                  title={chipLocked(val) || undefined}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={`${styles.progressRight} ${styles.hideOnPhone}`}>
              {randomBtn}
              {sortSelect}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <PageWrapper>
      <div className={styles.wrapper}>
        <motion.div className={styles.header} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Competitive Programming</h1>
            <span className={styles.count}>
              {total.toLocaleString()}{allProblems && total !== allProblems.length ? ` of ${allProblems.length.toLocaleString()}` : ''} problems
            </span>
          </div>
          <p className={styles.subtitle}>
            Codeforces problems - no explanations available. Click a problem to solve it on Codeforces.
          </p>
        </motion.div>

        <div className={styles.controls}>
          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              type="text"
              aria-label="Search problems by title or code"
              placeholder="Search by title or problem code (e.g. 1666L)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className={styles.phoneBar}>
            <button type="button" className={styles.phoneFiltersBtn} data-active={filterCount > 0} onClick={() => setFiltersOpen(true)}>
              Filters{filterCount > 0 && <span className={styles.phoneCount}>{filterCount}</span>}
            </button>
            {randomBtn}
            <Dropdown
              className={styles.phoneSort}
              align="right"
              ariaLabel="Sort problems"
              value={sort}
              options={SORT_OPTIONS}
              onChange={(v) => { setSort(v); resetToFirstPage(); }}
            />
          </div>
          <div className={styles.desktopOnly}>{filterPanel}</div>
          <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters" doneLabel={`Show ${total.toLocaleString()}`}>
            <div className={styles.sheetBody}>{filterPanel}</div>
          </BottomSheet>
        </div>

        {personalFailed && !isError && (
          <div className={styles.error} role="alert">
            <span>{'\u26a0'}</span> Couldn&apos;t load your progress, so the {statusFilter} filter is paused.
            <button className={styles.retryBtn} onClick={retryPersonal}>Retry</button>
          </div>
        )}
        {isError ? (
          <div className={styles.error}>
            <span>{'\u26a0'}</span> Couldn&apos;t load CP problems.
            <button className={styles.retryBtn} onClick={() => refetch()}>Retry</button>
          </div>
        ) : isLoading ? (
          <div className={styles.loading}>Loading...</div>
        ) : pageItems.length === 0 ? (
          <div className={styles.empty}>No problems match these filters.</div>
        ) : (
          <div className={styles.list}>
            {pageItems.map((p) => (
              <CpProblemRow
                key={p.canonical_id}
                problem={p}
                status={progressMap[p.canonical_id] || null}
                solveCount={solveCountById[p.canonical_id] || 0}
                isBookmarked={bookmarkedIds.has(p.canonical_id)}
                onSolved={() => markSolved(p.canonical_id)}
                onAttempted={() => markAttempted(p.canonical_id)}
                onReset={() => resetProgress(p.canonical_id)}
                onBookmark={() => toggleBookmark(p.canonical_id)}
                progressLocked={progressLocked}
                bookmarksLocked={bookmarksLocked}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button type="button" className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>{'\u2190'} Prev</button>
            <span className={styles.pageInfo}>{currentPage} / {totalPages}</span>
            <input
              className={styles.jumpInput}
              type="number"
              aria-label="Go to page"
              placeholder="Go to"
              value={jumpValue}
              min={1}
              max={totalPages}
              onChange={(e) => setJumpValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitJump()}
              onBlur={commitJump}
            />
            <button className={styles.pageBtn} disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next {'\u2192'}</button>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

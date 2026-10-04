'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useCpIndex } from '../../hooks/useProblems.js';
import { useProgress } from '../../hooks/useProgress.js';
import { useBookmarks } from '../../hooks/useBookmarks.js';
import { personalGate } from '../../lib/resourceState.js';
import { applyStatusFilter } from '../../lib/problems.filter.js';
import { matchesRatingBand, matchesCpSearch, getCpCodes, filterByTopics } from '../../lib/codeforces.utils.js';
import { getDisplayRating } from '../../lib/cpRating.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import TopicFilter from '../../components/cp/TopicFilter/TopicFilter.jsx';
import RatingBandFilter from '../../components/cp/RatingBandFilter/RatingBandFilter.jsx';
import RandomProblemButton from '../../components/cp/RandomProblemButton/RandomProblemButton.jsx';
import CpProblemRow from '../../components/cp/CpProblemRow/CpProblemRow.jsx';
import styles from './CpProblems.module.css';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300; // 10k rows are not re-filtered on every keystroke

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

// CP-specific sort - deliberately NOT the shared applySort()'s difficulty_asc/desc, which sorts by the
// normalized 1-10 `difficulty` field. Rating here means the real Codeforces rating (_cfRating,
// precomputed below), a completely different scale that's what this page's audience actually cares about.
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

// BUG FIX (unchanged from before): pagination-before-status-filter bug - see lib/problems.filter.js's
// doc comment. Load the full CP index once (react-query cached), filter+sort the complete array, THEN slice.
export default function CpProblemsClient() {
  const [page, setPage] = useState(1);
  const [jumpValue, setJumpValue] = useState('');
  const [searchInput, setSearchInput] = useState(''); // what the box shows, updates every keystroke
  const [search, setSearch] = useState(''); // debounced value the filters actually use
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [ratingBand, setRatingBand] = useState(null);
  const [sort, setSort] = useState('frequency');

  const { data: allProblems, isLoading, isError, refetch } = useCpIndex();
  const { progressList, progressMap, markSolved, markAttempted, resetProgress, state: progressState, degraded: progressDegraded, retry: retryProgress } = useProgress();
  const { bookmarkedIds, toggleBookmark, state: bookmarksState, degraded: bookmarksDegraded, retry: retryBookmarks } = useBookmarks();

  // ATLAS-BUG-003: the PUBLIC list renders as soon as the CP index is in. Personal filters/actions only work once the
  // resource they depend on is ready, and say why when it is not (signed-out users keep the existing sign-in prompt flow).
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

  // precomputed once per index load, not re-derived from source_platforms on every filter/sort pass.
  // BUG-038: _cfRating is the display rating (first rated mapping). _titleLower/_codes make search cheap.
  const problemsWithRating = useMemo(() => {
    if (!allProblems) return [];
    return allProblems.map((p) => ({
      ...p,
      _cfRating: getDisplayRating(p),
      _titleLower: (p.title || '').toLowerCase(),
      _codes: getCpCodes(p),
    }));
  }, [allProblems]);

  // BUG-037 debounce: commit the typed text 300 ms after the last keystroke, and go back to page 1 then
  useEffect(() => {
    const id = setTimeout(() => { setSearch(searchInput); setPage(1); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput]);

  const solveCountById = useMemo(() => {
    const map = {};
    for (const entry of progressList) map[entry.canonical_id] = entry.solve_count || 0;
    return map;
  }, [progressList]);

  // BUG-037: matches the title, or the code of ANY Codeforces mapping ("1519B", "1519-B", "1519/B" all work)
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return problemsWithRating;
    return problemsWithRating.filter((p) => matchesCpSearch(p, search));
  }, [problemsWithRating, search]);

  // topic (multi) + status filter - this is also exactly what RandomProblemButton's rating-band
  // dropdown draws from, since that override intentionally ignores the rating chip but keeps everything else
  const filteredWithoutRating = useMemo(() => {
    let list = filterByTopics(searchFiltered, selectedTopics); // includes the exclusive "Untagged" option
    // never run a personal filter against an unloaded/failed map: it would return wrong rows (BUG-002/003)
    if (personalGateState === 'ok') list = applyStatusFilter(list, statusFilter, progressMap, bookmarkedIds);
    return list;
  }, [searchFiltered, selectedTopics, statusFilter, progressMap, bookmarkedIds, personalGateState]);

  const visibleProblems = useMemo(() => {
    const list = filteredWithoutRating.filter((p) => matchesRatingBand(p._cfRating, ratingBand));
    return sortCpProblems(list, sort);
  }, [filteredWithoutRating, ratingBand, sort]);

  const total = visibleProblems.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Clamp: changing status or unbookmarking can shrink the result set below the current page.
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const offset = (currentPage - 1) * PAGE_SIZE;
    return visibleProblems.slice(offset, offset + PAGE_SIZE);
  }, [visibleProblems, currentPage]);

  // a status chip is locked when the resource it needs is not ready (Bookmarked needs bookmarks, the rest need progress)
  const chipLocked = (val) => (val === 'bookmarked' ? bookmarksLocked : progressLocked);

  const resetToFirstPage = () => setPage(1);
  const handleSetStatus = (val) => { setStatusFilter((s) => (s === val ? '' : val)); resetToFirstPage(); };
  const handleTopics = (val) => { setSelectedTopics(val); resetToFirstPage(); };
  const handleRatingBand = (val) => { setRatingBand(val); resetToFirstPage(); };

  const commitJump = () => {
    const n = parseInt(jumpValue, 10);
    if (Number.isFinite(n) && n >= 1 && n <= totalPages) setPage(n);
    setJumpValue('');
  };

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
            <RandomProblemButton visibleProblems={visibleProblems} filteredWithoutRating={filteredWithoutRating} />
          </div>

          {/* one panel, three labelled groups, so every control has an obvious place */}
          <div className={styles.filterPanel}>
            <div className={styles.filterGroup}>
              <span className={styles.groupLabel}>Topic and order</span>
              <div className={styles.groupBody}>
                <div className={styles.filterRow}>
                  <TopicFilter allProblems={problemsWithRating} selected={selectedTopics} onChange={handleTopics} />
                  <select className={styles.sortSelect} aria-label="Sort problems" value={sort} onChange={(e) => { setSort(e.target.value); resetToFirstPage(); }}>
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.groupLabel}>Rating</span>
              <div className={styles.groupBody}>
                <RatingBandFilter active={ratingBand} onChange={handleRatingBand} />
              </div>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.groupLabel}>My progress</span>
              <div className={styles.groupBody}>
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
              </div>
            </div>
          </div>
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

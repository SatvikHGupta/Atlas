import { useQuery } from '@tanstack/react-query';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { problemService } from '../../services/problem.service.js';
import { useProgress } from '../../hooks/useProgress.js';
import { useBookmarks } from '../../hooks/useBookmarks.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import DifficultyBadge from '../../components/problem/DifficultyBadge/DifficultyBadge.jsx';
import styles from './CpProblems.module.css';

// Same per-page filtering strategy as DSA Problems:
// fetch normal pages from backend, filter client-side using already-loaded
// progressMap and bookmarkedIds. No giant 5000-limit fetch.

const PAGE_SIZE = 50;

export default function CpProblems() {
  usePageTitle('CP Problems');

  const ss = sessionStorage;
  const [page,         setPageRaw]   = useState(() => parseInt(ss.getItem('cp-page') || '1', 10));
  const [search,       setSearchRaw] = useState(() => ss.getItem('cp-search') || '');
  const [topic,        setTopic]     = useState(() => ss.getItem('cp-topic')  || '');
  const [statusFilter, setStatus]    = useState('');
  const [jumpInput,    setJumpInput] = useState('');

  const setPage   = (v) => { const n = typeof v === 'function' ? v(page) : v; setPageRaw(n); ss.setItem('cp-page', String(n)); };
  const setSearch = (v) => { setSearchRaw(v); ss.setItem('cp-search', v); setPage(1); };

  const handleSetStatus = (val) => {
    setStatus(s => s === val ? '' : val);
    setPage(1);
  };

  const { progressList, progressMap, markSolved, markAttempted, resetProgress } = useProgress();
  const { bookmarkedIds, toggleBookmark } = useBookmarks();

  // pre-compute ID sets
  const solvedIds    = useMemo(() => new Set(progressList.filter(p => p.status === 'solved').map(p => p.canonical_id)),    [progressList]);
  const attemptedIds = useMemo(() => new Set(progressList.filter(p => p.status === 'attempted').map(p => p.canonical_id)), [progressList]);
  const excludedIds  = useMemo(() => new Set([...solvedIds, ...attemptedIds]), [solvedIds, attemptedIds]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cp-problems', page, search, topic],
    queryFn: () => problemService.getProblems({
      mode:  'cp',
      page,
      limit: PAGE_SIZE,
      sort:  'difficulty_asc',
      ...(search.length >= 2 ? { search } : {}),
      ...(topic ? { topic } : {}),
    }),
    staleTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const allProblems  = data?.data?.problems || [];
  const backendTotal = data?.data?.total    || 0;

  // per-page client filter (same logic as DSA Problems)
  let problems;
  let displayTotal;

  if (!statusFilter) {
    problems     = allProblems;
    displayTotal = backendTotal;
  } else if (statusFilter === 'unsolved') {
    problems     = allProblems.filter(p => !excludedIds.has(p.canonical_id));
    displayTotal = Math.max(0, backendTotal - excludedIds.size);
  } else if (statusFilter === 'solved') {
    problems     = allProblems.filter(p => solvedIds.has(p.canonical_id));
    displayTotal = solvedIds.size;
  } else if (statusFilter === 'attempted') {
    problems     = allProblems.filter(p => attemptedIds.has(p.canonical_id));
    displayTotal = attemptedIds.size;
  } else if (statusFilter === 'bookmarked') {
    problems     = allProblems.filter(p => bookmarkedIds.has(p.canonical_id));
    displayTotal = bookmarkedIds.size;
  }

  const totalPages = Math.ceil(displayTotal / PAGE_SIZE);

  const handleJump = (e) => {
    if (e.key !== 'Enter') return;
    const n = parseInt(jumpInput, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) { setPage(n); setJumpInput(''); }
  };

  return (
    <PageWrapper>
      <div className={styles.wrapper}>

        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Competitive Programming</h1>
            <span className={styles.count}>{displayTotal.toLocaleString()} problems</span>
          </div>
          <p className={styles.subtitle}>
            Codeforces problems - no explanations available. Click a problem to solve it on Codeforces.
          </p>
        </motion.div>

        <motion.div
          className={styles.controls}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className={styles.statusChips}>
            {[
              { val: 'solved',     label: 'Solved' },
              { val: 'attempted',  label: 'Attempted' },
              { val: 'unsolved',   label: 'Unsolved' },
              { val: 'bookmarked', label: 'Bookmarked' },
            ].map(({ val, label }) => (
              <button
                key={val}
                className={styles.statusChip}
                data-val={val}
                data-active={statusFilter === val}
                onClick={() => handleSetStatus(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {isError ? (
          <div className={styles.error}>
            <span>⚠</span> Couldn't load CP problems. Make sure the backend is running.
          </div>
        ) : isLoading ? (
          <div className={styles.loading}>Loading...</div>
        ) : problems.length === 0 ? (
          <div className={styles.empty}>No problems found.</div>
        ) : (
          <motion.div
            className={styles.list}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {problems.map((p) => (
              <CpProblemRow
                key={p.canonical_id}
                problem={p}
                status={progressMap[p.canonical_id] || null}
                onSolved={() => markSolved(p.canonical_id)}
                onAttempted={() => markAttempted(p.canonical_id)}
                onReset={() => resetProgress(p.canonical_id)}
                bookmarked={bookmarkedIds.has(p.canonical_id)}
                onBookmark={() => toggleBookmark(p.canonical_id)}
              />
            ))}
          </motion.div>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Prev
            </button>
            <div className={styles.pageCenter}>
              <span className={styles.pageInfo}>{page} / {totalPages}</span>
              <input
                className={styles.jumpInput}
                type="number"
                min={1}
                max={totalPages}
                placeholder="Go to"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                onKeyDown={handleJump}
              />
            </div>
            <button
              className={styles.pageBtn}
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </button>
          </div>
        )}

      </div>
    </PageWrapper>
  );
}

function CpProblemRow({ problem, status, onSolved, onAttempted, onReset, bookmarked, onBookmark }) {
  const cfPlatform = problem.source_platforms?.find((p) => p.platform === 'codeforces');
  const url = cfPlatform?.url || null;

  const openProblem = () => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleStatus = (e, fn) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div className={styles.row} data-status={status || ''}>
      <div className={styles.rowMain} onClick={openProblem} role="link" tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && openProblem()}
      >
        <DifficultyBadge score={problem.difficulty} />
        <span className={styles.rowTitle}>{problem.title}</span>
      </div>

      <div className={styles.rowRight}>
        {problem.topics?.slice(0, 2).map((t) => (
          <span key={t} className={styles.topicTag}>{t}</span>
        ))}

        <button
          className={styles.markBtn}
          data-type="solved"
          data-active={status === 'solved'}
          aria-label={status === 'solved' ? 'Mark unsolved' : 'Mark solved'}
          aria-pressed={status === 'solved'}
          title={status === 'solved' ? 'Mark unsolved' : 'Mark solved'}
          onClick={(e) => handleStatus(e, status === 'solved' ? onReset : onSolved)}
        >✓</button>
        <button
          className={styles.markBtn}
          data-type="attempted"
          data-active={status === 'attempted'}
          aria-label={status === 'attempted' ? 'Remove attempted' : 'Mark attempted'}
          aria-pressed={status === 'attempted'}
          title={status === 'attempted' ? 'Remove attempted' : 'Mark attempted'}
          onClick={(e) => handleStatus(e, status === 'attempted' ? onReset : onAttempted)}
        >~</button>
        <button
          className={styles.markBtn}
          data-type="bookmark"
          data-active={bookmarked}
          aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
          aria-pressed={bookmarked}
          title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
          onClick={(e) => handleStatus(e, onBookmark)}
        >{bookmarked ? '★' : '☆'}</button>

        {/* CF link is the same target as the row itself (openProblem) - no
            separate tabIndex/keyboard handling needed since it's decorative
            next to an already-reachable row; hidden from AT to avoid a
            confusing duplicate stop. */}
        {url && <span className={styles.cfLink} aria-hidden="true">↗ CF</span>}
      </div>
    </div>
  );
}

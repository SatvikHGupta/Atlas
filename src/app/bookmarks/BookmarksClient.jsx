'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth.js';
import { useBookmarks } from '../../hooks/useBookmarks.js';
import { useProgress } from '../../hooks/useProgress.js';
import { useDsaIndex, useCpIndex } from '../../hooks/useProblems.js';
import { resolveIds, needsCpIndex } from '../../lib/resolveIds.js';
import { getCfUrl } from '../../lib/codeforces.utils.js';
import { getDisplayRating, getPrimaryMapping } from '../../lib/cpRating.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import ProblemCard from '../../components/problem/ProblemCard/ProblemCard.jsx';
import RatingPill from '../../components/cp/RatingPill/RatingPill.jsx';
import { Loader } from '../../components/ui/Loader/Loader.jsx';
import BackButton from '../../components/ui/BackButton/BackButton.jsx';
import styles from './Bookmarks.module.css';

// CP bookmarks link out to Codeforces, so they get their own small card instead of ProblemCard (which links to /problems/<slug>).
function CpBookmarkCard({ problem, onBookmark }) {
  const url = getCfUrl(problem);
  const code = getPrimaryMapping(problem)?.platform_id || null;
  const body = (
    <>
      <span className={styles.cpTitle}>{problem.title}</span>
      <span className={styles.cpMeta}>
        <RatingPill rating={getDisplayRating(problem)} />
        {code && <span className={styles.cpCode}>{code}</span>}
        {url && <span aria-hidden="true">{'\u2197'}</span>}
      </span>
    </>
  );
  return (
    <div className={styles.cpCard}>
      {url ? (
        <a className={styles.cpLink} href={url} target="_blank" rel="noopener noreferrer">{body}</a>
      ) : (
        <div className={styles.cpLink}>{body}</div>
      )}
      <button className={styles.cpBookmarkBtn} data-active="true" aria-label="Remove bookmark" title="Remove bookmark" onClick={onBookmark}>
        {'\u2605'}
      </button>
    </div>
  );
}

export default function BookmarksClient() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { bookmarks, bookmarkedIds, toggleBookmark, isLoading: bookmarksLoading, loadError: bookmarksError, retry: retryBookmarks } = useBookmarks();
  const { progressMap } = useProgress();
  const { data: dsaIndex, isLoading: dsaLoading, isError: dsaError, refetch: refetchDsa } = useDsaIndex();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login?from=/bookmarks');
  }, [authLoading, isAuthenticated, router]);

  const ids = useMemo(() => bookmarks.map((b) => b.canonical_id), [bookmarks]);

  // The CP index is about 6 MB: only fetch it when some bookmark is not a DSA problem.
  const cpNeeded = useMemo(() => needsCpIndex(ids, dsaIndex), [ids, dsaIndex]);
  const { data: cpIndex, isLoading: cpLoading, isError: cpError, refetch: refetchCp } = useCpIndex({ enabled: cpNeeded });

  const { items, unresolved } = useMemo(() => resolveIds(ids, dsaIndex, cpIndex), [ids, dsaIndex, cpIndex]);

  if (!authLoading && !isAuthenticated) return null;

  const isLoading = authLoading || bookmarksLoading || dsaLoading || (cpNeeded && cpLoading);
  // ATLAS-BUG-002: a FAILED bookmarks read must show an error + retry, never the "no bookmarks yet" empty state
  const isError = !!bookmarksError || dsaError || (cpNeeded && cpError);
  const retry = () => { if (bookmarksError) retryBookmarks?.(); if (dsaError) refetchDsa(); if (cpError) refetchCp(); };

  // BUG-041: the number is the store count, the same population the Dashboard and profile show.
  const total = bookmarks.length;
  const dsaCount = items.filter((i) => i.kind === 'dsa').length;
  const cpCount = items.length - dsaCount;

  return (
    <PageWrapper>
      <div className={styles.wrapper}>
        <BackButton fallback="/dashboard" />
        <div className={styles.header}>
          <h1>Bookmarks</h1>
          <p>
            {bookmarksError ? 'Your bookmarks could not be loaded.' : `${total} ${total === 1 ? 'problem' : 'problems'} saved for later.`}
            {!isLoading && !isError && total > 0 && cpCount > 0 && ` ${dsaCount} DSA, ${cpCount} CP.`}
          </p>
          {!isLoading && !isError && unresolved.length > 0 && (
            <p className={styles.unresolved}>
              {unresolved.length} {unresolved.length === 1 ? 'item' : 'items'} no longer in the catalogue.
            </p>
          )}
        </div>

        {isError ? (
          <div className={styles.errorBox} role="alert">
            <p>Couldn&apos;t load your bookmarked problems.</p>
            <button className={styles.retryBtn} onClick={retry}>Retry</button>
          </div>
        ) : isLoading ? (
          <div className={styles.loading}><Loader size={28} /></div>
        ) : total === 0 ? (
          <div className={styles.empty}>
            <p>Nothing saved yet.</p>
            <p className={styles.emptySub}>Tap the star on any problem to keep it here.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {items.map(({ id, kind, problem }) => (
              <div key={id} className={styles.cell}>
                <span className={styles.kindBadge} data-kind={kind}>{kind === 'cp' ? 'CP' : 'DSA'}</span>
                {kind === 'dsa' ? (
                  <ProblemCard
                    problem={problem}
                    isBookmarked={bookmarkedIds.has(id)}
                    status={progressMap[id] || null}
                    onBookmark={toggleBookmark}
                  />
                ) : (
                  <CpBookmarkCard problem={problem} onBookmark={() => toggleBookmark(id)} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

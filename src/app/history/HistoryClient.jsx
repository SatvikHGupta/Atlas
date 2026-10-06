'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth.js';
import { useProgress } from '../../hooks/useProgress.js';
import { useDsaIndex, useCpIndex } from '../../hooks/useProblems.js';
import { resolveIds, needsCpIndex } from '../../lib/resolveIds.js';
import { groupByLocalDay } from '../../lib/stats.js';
import { todayKey, addDays } from '../../lib/dates.js';
import { getCfUrl } from '../../lib/codeforces.utils.js';
import { getDisplayRating } from '../../lib/cpRating.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import DifficultyBadge from '../../components/problem/DifficultyBadge/DifficultyBadge.jsx';
import RatingPill from '../../components/cp/RatingPill/RatingPill.jsx';
import { Loader } from '../../components/ui/Loader/Loader.jsx';
import BackButton from '../../components/ui/BackButton/BackButton.jsx';
import styles from './History.module.css';

// BUG-061: `dayKey` is already a LOCAL "YYYY-MM-DD" key (lib/dates.js), so it is parsed by hand, not via new Date(string) which is UTC.
function formatDayHeading(dayKey) {
  if (dayKey === null) return 'Earlier';
  const today = todayKey();
  if (dayKey === today) return 'Today';
  if (dayKey === addDays(today, -1)) return 'Yesterday';
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function HistoryClient() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { progressList, isLoading: progressLoading, loadError, retry } = useProgress();
  const { data: dsaIndex, isLoading: dsaLoading, isError: dsaError, refetch: refetchDsa } = useDsaIndex();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/login?from=/history');
  }, [authLoading, isAuthenticated, router]);

  const ids = useMemo(() => progressList.map((p) => p.canonical_id), [progressList]);

  // The CP index is about 6 MB: only fetch it when some entry is not a DSA problem.
  const cpNeeded = useMemo(() => needsCpIndex(ids, dsaIndex), [ids, dsaIndex]);
  const { data: cpIndex, isLoading: cpLoading, isError: cpError, refetch: refetchCp } = useCpIndex({ enabled: cpNeeded });

  const { resolvedById, unresolvedCount } = useMemo(() => {
    const { items, unresolved } = resolveIds(ids, dsaIndex, cpIndex);
    return { resolvedById: new Map(items.map((i) => [i.id, i])), unresolvedCount: unresolved.length };
  }, [ids, dsaIndex, cpIndex]);

  // BUG-042/161/061: DSA and CP entries, grouped by the viewer's local day. Ids in neither index are counted, not dropped silently.
  const groupedByDay = useMemo(() => {
    const entries = progressList.filter((p) => resolvedById.has(p.canonical_id));
    return groupByLocalDay(entries, (p) => p.updated_at);
  }, [progressList, resolvedById]);

  if (!authLoading && !isAuthenticated) return null;

  const isLoading = authLoading || progressLoading || dsaLoading || (cpNeeded && cpLoading);
  const isError = !!loadError || dsaError || (cpNeeded && cpError);
  const retryAll = () => {
    if (loadError) retry?.();
    if (dsaError) refetchDsa();
    if (cpError) refetchCp();
  };

  return (
    <PageWrapper>
      <div className={styles.wrapper}>
        <BackButton fallback="/dashboard" />
        <div className={styles.header}>
          {/* BUG-160: progress is one current record per problem, not an event log, so say exactly that. */}
          <h1>Recent activity</h1>
          <p>
            The latest status of every problem you have marked solved or attempted (DSA and CP), most recent first.
            Only the current status is kept, not every change.
          </p>
          {!isLoading && !isError && unresolvedCount > 0 && (
            <p className={styles.unresolved}>
              {unresolvedCount} {unresolvedCount === 1 ? 'item' : 'items'} no longer in the catalogue.
            </p>
          )}
        </div>

        {isError ? (
          <div className={styles.errorBox} role="alert">
            <p>Couldn&apos;t load your activity.</p>
            <button className={styles.retryBtn} onClick={retryAll}>Retry</button>
          </div>
        ) : isLoading ? (
          <div className={styles.loading}><Loader size={28} /></div>
        ) : groupedByDay.length === 0 ? (
          <div className={styles.empty}>
            <p>No activity yet.</p>
            <p className={styles.emptySub}>Mark a problem solved or attempted and it shows up here.</p>
          </div>
        ) : (
          <div className={styles.timeline}>
            {groupedByDay.map(({ day, entries }) => (
              <div key={day ?? 'undated'} className={styles.dayGroup}>
                <h2 className={styles.dayHeading}>{formatDayHeading(day)}</h2>
                <div className={styles.entryList}>
                  {entries.map((entry) => {
                    const { kind, problem } = resolvedById.get(entry.canonical_id);
                    const time = entry.updated_at
                      ? new Date(entry.updated_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                      : '';
                    const rowBody = (
                      <>
                        <span className={styles.statusDot} data-status={entry.status} aria-hidden="true" />
                        <span className={styles.entryTitle}>{problem.title}</span>
                        <span className={styles.kindBadge} data-kind={kind}>{kind === 'cp' ? 'CP' : 'DSA'}</span>
                        {kind === 'cp' && <RatingPill rating={getDisplayRating(problem)} />}
                        <DifficultyBadge score={problem.difficulty} />
                        <span className={styles.entryStatus}>{entry.status}</span>
                        <span className={styles.entryTime}>{time}</span>
                      </>
                    );
                    const key = `${entry.canonical_id}-${entry.updated_at}`;
                    const cpUrl = kind === 'cp' ? getCfUrl(problem) : null;
                    // DSA rows open the problem page, CP rows open the external Codeforces problem.
                    if (kind === 'dsa') {
                      return <Link key={key} href={`/problems/${problem.slug}`} className={styles.entryRow}>{rowBody}</Link>;
                    }
                    return cpUrl ? (
                      <a key={key} href={cpUrl} target="_blank" rel="noopener noreferrer" className={styles.entryRow}>{rowBody}</a>
                    ) : (
                      <div key={key} className={styles.entryRow}>{rowBody}</div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

'use client';

import { useMemo } from 'react';
import { useDsaIndex, useCpIndex } from '../../../hooks/useProblems.js';
import { needsCpIndex } from '../../../lib/resolveIds.js';
import { getCfUrl } from '../../../lib/codeforces.utils.js';
import { seededPicks } from '../../../lib/random.js';
import { todayKey } from '../../../lib/dates.js';
import { getDisplayRating } from '../../../lib/cpRating.js';
import RatingPill from '../../cp/RatingPill/RatingPill.jsx';
import styles from './CpUpsolve.module.css';

const MIN_SOLVED_FOR_ESTIMATE = 5;
const SUGGESTION_COUNT = 5;

// CP-only, deliberately - built from useCpIndex/progress on CP canonical_ids
function computeComfortRating(solvedRatings) {
  if (solvedRatings.length < MIN_SOLVED_FOR_ESTIMATE) return null;
  const sorted = [...solvedRatings].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.7));
  return Math.round(sorted[idx] / 100) * 100;
}

export default function CpUpsolve({ progressList }) {
  const { data: dsaIndex } = useDsaIndex();
  const cpNeeded = useMemo(
    () => needsCpIndex(progressList.map((p) => p.canonical_id), dsaIndex),
    [progressList, dsaIndex]
  );
  const { data: cpProblems, isLoading } = useCpIndex({ enabled: cpNeeded });

  const { comfortRating, suggestions } = useMemo(() => {
    if (!cpProblems) return { comfortRating: null, suggestions: [] };

    const cpById = new Map(cpProblems.map((p) => [p.canonical_id, p]));
    const touchedIds = new Set(progressList.map((p) => p.canonical_id));

    const solvedRatings = progressList
      .filter((p) => p.status === 'solved' && cpById.has(p.canonical_id))
      .map((p) => getDisplayRating(cpById.get(p.canonical_id)))
      .filter((r) => r != null);

    const comfort = computeComfortRating(solvedRatings);
    if (comfort == null) return { comfortRating: null, suggestions: [] };

    const windows = [[comfort + 100, comfort + 300], [comfort + 100, comfort + 400]];
    let pool = [];
    for (const [min, max] of windows) {
      pool = cpProblems.filter((p) => {
        if (touchedIds.has(p.canonical_id)) return false;
        const r = getDisplayRating(p);
        return r != null && r >= min && r <= max && !!getCfUrl(p);
      });
      if (pool.length >= SUGGESTION_COUNT) break;
    }

    const picks = seededPicks(pool, SUGGESTION_COUNT, todayKey(), (p) => p.canonical_id);

    return { comfortRating: comfort, suggestions: picks };
  }, [cpProblems, progressList]);

  if (!cpNeeded || isLoading || comfortRating == null) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Upsolve suggestions</h2>
      <p className={styles.hint}>
        Based on your solved Codeforces problems, you&apos;re comfortable around <b>{comfortRating}</b>. Here&apos;s a few just above that.
      </p>
      {suggestions.length === 0 ? (
        <p className={styles.empty}>Nothing unsolved in that range right now - nice work.</p>
      ) : (
        <div className={styles.list}>
          {suggestions.map((p) => (
            <a key={p.canonical_id} href={getCfUrl(p)} target="_blank" rel="noopener noreferrer" className={styles.row}>
              <RatingPill rating={getDisplayRating(p)} />
              <span className={styles.title}>{p.title}</span>
              <span className={styles.arrow} aria-hidden="true">{'\u2197'}</span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

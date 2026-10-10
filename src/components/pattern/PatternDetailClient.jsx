'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import CompanyChipRow from '../company/CompanyChipRow.jsx';
import ResponsiveSelect from '../ui/Dropdown/ResponsiveSelect.jsx';
import styles from '../../app/patterns/[slug]/PatternDetail.module.css';

const DIFF_CLASS = { easy: 'diffEasy', medium: 'diffMedium', hard: 'diffHard' };
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default function PatternDetailClient({ problems, companyNames }) {
  const [difficulty, setDifficulty] = useState(null);
  const [sortBy, setSortBy] = useState('askedAt');

  const visible = useMemo(() => {
    let rows = problems;
    if (difficulty) rows = rows.filter((p) => (p.difficulty || '').toLowerCase() === difficulty.toLowerCase());
    return [...rows].sort((a, b) => {
      if (sortBy === 'difficulty') {
        const order = { easy: 0, medium: 1, hard: 2 };
        return (order[(a.difficulty || '').toLowerCase()] ?? 3) - (order[(b.difficulty || '').toLowerCase()] ?? 3);
      }
      return (b.askedAtCount || 0) - (a.askedAtCount || 0);
    });
  }, [problems, difficulty, sortBy]);

  return (
    <>
      <div className={styles.filterBar}>
        <div className={styles.tabs} role="group" aria-label="Filter by difficulty">
          <button
            className={`${styles.tab} ${!difficulty ? styles.tabActive : ''}`}
            onClick={() => setDifficulty(null)}
            type="button" aria-pressed={!difficulty}
          >
            All
          </button>
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={`${styles.tab} ${difficulty === d ? styles.tabActive : ''}`}
              onClick={() => setDifficulty(d)}
              type="button" aria-pressed={difficulty === d}
            >
              {d}
            </button>
          ))}
        </div>
        <ResponsiveSelect
          nativeClassName={styles.sortSelect}
          ariaLabel="Sort problems"
          value={sortBy}
          onChange={setSortBy}
          options={[{ value: 'askedAt', label: 'Most asked first' }, { value: 'difficulty', label: 'Easiest first' }]}
        />
      </div>

      <div className={styles.practiceList}>
        {visible.map((p) => {
          const internalHref = p.atlasProblemId ? `/problems/${p.atlasSlug || p.atlasProblemId}` : null;
          const externalHref = !p.atlasProblemId ? `https://leetcode.com/problems/${p.leetcodeSlug}/` : null;
          const diffKey = DIFF_CLASS[(p.difficulty || '').toLowerCase()];
          const companies = (p.askedAt || []).map((id) => ({ id, name: companyNames[id] || id }));

          return (
            <div className={styles.practiceRow} key={p.leetcodeSlug}>
              <div className={styles.practiceTop}>
                {internalHref ? (
                  <Link className={styles.practiceTitle} href={internalHref}>{p.title}</Link>
                ) : (
                  <a className={styles.practiceTitle} href={externalHref} target="_blank" rel="noreferrer">{p.title}</a>
                )}
                {p.inNote && <span className={styles.inNoteBadge} title="One of the note's worked examples">&#128214;</span>}
                <span className={`${styles.diffPill} ${diffKey ? styles[diffKey] : ''}`}>{p.difficulty}</span>
              </div>

              {p.alsoTagged?.length > 0 && (
                <div className={styles.alsoTaggedRow}>
                  <span className={styles.alsoTaggedLabel}>Also:</span>
                  {p.alsoTagged.map((t) => (
                    <Link key={t.slug} href={`/patterns/${t.slug}`} className={styles.alsoTaggedChip}>{t.name}</Link>
                  ))}
                </div>
              )}

              <CompanyChipRow companies={companies} />
            </div>
          );
        })}
      </div>
    </>
  );
}

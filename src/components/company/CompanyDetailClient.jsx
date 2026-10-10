'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import ProblemRow from './ProblemRow.jsx';
import RoleGuide from './RoleGuide.jsx';
import LadderSection from './LadderSection.jsx';
import CompanyLinks from './CompanyLinks.jsx';
import CompanyFootnotes from './CompanyFootnotes.jsx';
import CompanyBadge, { nameHue } from './CompanyBadge.jsx';
import { patternSlug } from '../../lib/patternSlug.js';
import ResponsiveSelect from '../ui/Dropdown/ResponsiveSelect.jsx';
import styles from '../../app/companies/[id]/CompanyDetail.module.css';

const ROLE_ALL = '__all__';
const PATTERN_CHIPS_COLLAPSED = 10;

// Cursor-follow spotlight (--mx/--my), same trick used on the list-page cards
function handleMove(e) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

export default function CompanyDetailClient({ data }) {
  const [role, setRole] = useState(ROLE_ALL);
  const [patternFilter, setPatternFilter] = useState(null);
  const [sortBy, setSortBy] = useState('frequency');
  const [showAllPatterns, setShowAllPatterns] = useState(false);

  const allPatterns = useMemo(() => {
    const counts = new Map();
    data.problems.forEach((p) => (p.patterns || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [data]);

  const visiblePatterns = showAllPatterns ? allPatterns : allPatterns.slice(0, PATTERN_CHIPS_COLLAPSED);
  const hiddenPatternCount = allPatterns.length - visiblePatterns.length;

  const filtered = useMemo(() => {
    let rows = data.problems;
    if (role !== ROLE_ALL) {
      rows = rows.filter((p) => !p.role || p.role === role);
    }
    if (patternFilter) {
      rows = rows.filter((p) => (p.patterns || []).includes(patternFilter));
    }
    return [...rows].sort((a, b) => {
      if (sortBy === 'confidence' && a.confidenceTier !== b.confidenceTier) {
        const rank = (t) => (t === 'A' ? 0 : t === 'B' ? 1 : t === 'C' ? 2 : 3);
        return rank(a.confidenceTier) - rank(b.confidenceTier);
      }
      return (b.frequency ?? -1) - (a.frequency ?? -1);
    });
  }, [data, role, patternFilter, sortBy]);

  const activeGuidance = role !== ROLE_ALL ? data.roleGuidance?.[role] : null;
  const companyHue = nameHue(data.name);
  const pageStyle = {
    '--company-hue-glow': `hsl(${companyHue} 70% var(--hue-l) / 0.16)`,
    '--company-hue-light': `hsl(${companyHue} 80% var(--hue-text-l))`,
  };

  return (
    <div className={styles.page} style={pageStyle}>
      <div className={styles.headerGlow} aria-hidden="true" />
      <Link className={styles.back} href="/companies">&larr; All companies</Link>

      <header className={styles.header}>
        <div className={styles.titleRow}>
          <CompanyBadge name={data.name} domain={data.domain} logo={data.logo} size={48} />
          <h1>{data.name}</h1>
          <span className={`${styles.tierBadge} ${data.tier === 1 ? styles.tierBadge1 : ''}`}>Tier {data.tier}</span>
        </div>
        <p className={styles.subtitle}>
          {data.pool?.linkable > data.problems.length
            ? `Top ${data.problems.filter((p) => p.rank != null).length} of ${data.pool.linkable} problems by frequency`
            : `${data.problems.length} problems tracked`}
          {data.totalTaggedByLeetCode ? ` \u00b7 ${data.totalTaggedByLeetCode} tagged by LeetCode overall` : ''}
        </p>
        <CompanyLinks data={data} />
      </header>

      {data.patternProfile?.length > 0 && (
        <section className={styles.profile}>
          <h2 className={styles.sectionTitle}>Asks most from</h2>
          <div className={styles.profileBars}>
            {data.patternProfile.slice(0, 6).map((p) => {
              const hue = nameHue(p.pattern);
              return (
                <Link
                  key={p.pattern}
                  href={`/patterns/${patternSlug(p.pattern)}`}
                  onMouseMove={handleMove}
                  className={styles.profileBar}
                  style={{ background: `linear-gradient(160deg, hsl(${hue} 75% var(--hue-l) / 0.09), transparent 55%), var(--bg-card)` }}
                  title={`${p.count} problems \u00b7 view practice set`}
                >
                  <div className={styles.profileBarTop}>
                    <span>{p.pattern}</span>
                    <span className={styles.profileShare} style={{ color: `hsl(${hue} 80% var(--hue-text-l))` }}>{p.share}%</span>
                  </div>
                  <div className={styles.profileTrack}>
                    <div
                      className={styles.profileFill}
                      style={{ width: `${Math.min(100, (p.share / (data.patternProfile[0]?.share || 1)) * 100)}%`, background: `linear-gradient(90deg, hsl(${hue} 70% var(--hue-l)), hsl(${hue} 70% calc(var(--hue-l) + 12%)))` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <LadderSection data={data} />

      {data.rolesStatus !== 'researched' && (
        <div className={styles.rolesPending}>
          Levels &amp; role-specific interview data hasn&apos;t been researched for {data.name} yet - shown here once it has.
        </div>
      )}

      {data.roles?.length > 0 && (
        <section className={styles.tabsSection}>
          <h2 className={styles.sectionTitle}>Filter by role</h2>
          <div className={styles.tabs} role="group" aria-label="Filter by role">
            <button
              className={`${styles.tab} ${role === ROLE_ALL ? styles.tabActive : ''}`}
              onClick={() => setRole(ROLE_ALL)}
              type="button" aria-pressed={role === ROLE_ALL}
            >
              All roles
            </button>
            {data.roles.map((r) => (
              <button
                key={r}
                className={`${styles.tab} ${role === r ? styles.tabActive : ''}`}
                onClick={() => setRole(r)}
                type="button" aria-pressed={role === r}
              >
                {r}
              </button>
            ))}
          </div>
        </section>
      )}

      {activeGuidance && (
        <div style={{ marginBottom: 36 }}>
          <RoleGuide role={role} guidance={activeGuidance} />
        </div>
      )}

      <section className={styles.filtersSection}>
        <div className={styles.detailControls}>
          {allPatterns.length > 0 && (
            <div className={styles.patternFilter}>
              <h2 className={styles.sectionTitle}>Filter by pattern</h2>
              <div className={styles.patternChips}>
                {visiblePatterns.map((t) => (
                  <button
                    key={t}
                    className={`${styles.chip} ${patternFilter === t ? styles.chipActive : ''}`}
                    onClick={() => setPatternFilter(patternFilter === t ? null : t)}
                    type="button"
                    aria-pressed={patternFilter === t}
                  >
                    {t}
                  </button>
                ))}
                {hiddenPatternCount > 0 && (
                  <button className={styles.patternMore} onClick={() => setShowAllPatterns(true)} type="button">
                    +{hiddenPatternCount} more
                  </button>
                )}
                {showAllPatterns && allPatterns.length > PATTERN_CHIPS_COLLAPSED && (
                  <button className={styles.patternMore} onClick={() => setShowAllPatterns(false)} type="button">
                    Show less
                  </button>
                )}
              </div>
            </div>
          )}
          <div className={styles.sort}>
            <label htmlFor="cp-sort-select">Sort</label>
            <ResponsiveSelect
              id="cp-sort-select"
              ariaLabel="Sort"
              value={sortBy}
              onChange={setSortBy}
              options={[{ value: 'frequency', label: 'Frequency' }, { value: 'confidence', label: 'Confidence' }]}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>
          Problems{patternFilter ? ` tagged "${patternFilter}"` : ''} ({filtered.length})
        </h2>
        <div className={styles.problemList}>
          {filtered.length === 0 && <div className={styles.state}>No problems match this filter.</div>}
          {filtered.map((p, i) => <ProblemRow key={`${p.leetcodeSlug || p.title}-${i}`} problem={p} />)}
        </div>
      </section>

      <CompanyFootnotes data={data} />
    </div>
  );
}

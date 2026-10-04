'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import CompanyBadge, { nameHue } from './CompanyBadge.jsx';
import styles from '../../app/companies/CompanyList.module.css';

const TIERS = [
  { value: 1, label: 'Tier 1', hint: 'Deep pool, high confidence' },
  { value: 2, label: 'Tier 2', hint: 'Moderate coverage' },
  { value: 3, label: 'Tier 3', hint: 'IT services / aptitude-coding' },
];

const REGIONS = [
  { value: 'India', label: 'India' },
  { value: 'Global', label: 'Global' },
];

const SORTS = [
  { value: 'pool', label: 'Pool size' },
  { value: 'tier', label: 'Tier' },
  { value: 'name', label: 'Name (A-Z)' },
];

function filterCompanies(index, { query, tiers, regions }) {
  const q = query.trim().toLowerCase();
  return index.filter((c) => {
    const matchesQuery = !q || c.name.toLowerCase().includes(q);
    const matchesTier = !tiers.length || tiers.includes(c.tier);
    const matchesRegion = !regions.length || regions.includes(c.region);
    return matchesQuery && matchesTier && matchesRegion;
  });
}

function sortCompanies(list, sortBy) {
  const sorted = [...list];
  if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortBy === 'tier') sorted.sort((a, b) => a.tier - b.tier || (b.poolLinkable ?? b.problemCount) - (a.poolLinkable ?? a.problemCount));
  else sorted.sort((a, b) => (b.poolLinkable ?? b.problemCount) - (a.poolLinkable ?? a.problemCount));
  return sorted;
}

function roleChips(roles, max = 3) {
  const shown = roles.slice(0, max);
  const rest = roles.length - shown.length;
  return { shown, rest };
}

// Cursor-follow spotlight (--mx/--my), same trick as PatternCard.jsx.
function handleMove(e) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

// REBUILD: added the region filter (India/Global - the data has always had this, nothing in the UI used it) and a
// sort control (pool size / tier / name); logos now come from each company's own `domain` field instead of a
// name-keyed lookup (see CompanyBadge.jsx). Filtering/sorting stay client-side since the whole index is a few KB.
export default function CompanyBrowser({ companies }) {
  const [query, setQuery] = useState('');
  const [tiers, setTiers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [sortBy, setSortBy] = useState('pool');

  const visible = useMemo(
    () => sortCompanies(filterCompanies(companies, { query, tiers, regions }), sortBy),
    [companies, query, tiers, regions, sortBy],
  );

  const toggleTier = (t) => setTiers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const toggleRegion = (r) => setRegions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  return (
    <>
      <div className={styles.controls}>
        <input
          className={styles.search}
          type="text"
          placeholder="Search a company…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search companies"
        />
        <div className={styles.tierChips} role="group" aria-label="Filter by tier">
          {TIERS.map((t) => (
            <button
              key={t.value}
              className={`${styles.chip} ${tiers.includes(t.value) ? styles.chipActive : ''}`}
              onClick={() => toggleTier(t.value)}
              title={t.hint}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className={styles.regionChips} role="group" aria-label="Filter by region">
          {REGIONS.map((r) => (
            <button
              key={r.value}
              className={`${styles.chip} ${regions.includes(r.value) ? styles.chipActive : ''}`}
              onClick={() => toggleRegion(r.value)}
              type="button"
            >
              {r.label}
            </button>
          ))}
        </div>
        <select
          className={styles.sortSelect}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort companies"
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
        </select>
      </div>

      <div className={styles.resultCount}>{visible.length} of {companies.length} companies</div>

      {visible.length === 0 && <div className={styles.emptyState}>No companies match that search.</div>}

      {visible.length > 0 && (
        <div className={styles.grid}>
          {visible.map((c, i) => {
            const hue = nameHue(c.name);
            const { shown, rest } = roleChips(c.roles || []);
            const cardStyle = {
              background: `linear-gradient(160deg, hsl(${hue} 75% var(--hue-l) / 0.07), transparent 55%), var(--bg-card)`,
              '--card-hue-strong': `hsl(${hue} 70% var(--hue-l))`,
            };
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i, 12) * 0.02 }}
                whileHover={{ y: -3 }}
                style={{ height: '100%' }}
              >
                <Link
                  href={`/companies/${c.id}`}
                  onMouseMove={handleMove}
                  style={cardStyle}
                  className={`${styles.card} ${c.tier === 1 ? styles.cardTier1 : ''}`}
                >
                  <div className={styles.cardTop}>
                    <CompanyBadge name={c.name} domain={c.domain} logo={c.logo} size={40} />
                    <span className={styles.cardName}>{c.name}</span>
                    <span className={`${styles.tierBadge} ${c.tier === 1 ? styles.tierBadge1 : ''}`}>T{c.tier}</span>
                  </div>

                  <div className={styles.cardStat}>
                    <span className={styles.cardStatValue} style={{ color: `hsl(${hue} 80% var(--hue-text-l))` }}>{c.problemCount}</span>
                    <span className={styles.cardStatLabel}>problems tracked</span>
                  </div>

                  {shown.length > 0 && (
                    <div className={styles.roleChips}>
                      {shown.map((r) => <span key={r} className={styles.roleChip}>{r}</span>)}
                      {rest > 0 && <span className={`${styles.roleChip} ${styles.roleChipMore}`}>+{rest}</span>}
                    </div>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}

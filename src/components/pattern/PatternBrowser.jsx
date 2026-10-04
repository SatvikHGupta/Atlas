'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import PatternCard from './PatternCard.jsx';
import { PATTERN_TIERS, tierOf } from '../../lib/patternTiers.js';
import { PATTERN_NOTE_MAP } from '../../lib/patternNoteMap.js';
import styles from '../../app/patterns/PatternList.module.css';

const SECTION_COLLAPSED_COUNT = 12;

// Search stays a PATTERN search - a hit never surfaces a problem, only the pattern it belongs to -
// but the match itself checks the pattern name AND its practice-problem titles (from the `titles`
// field build-companies.mjs now writes into patterns/index.json). So searching "palindrome" surfaces
// the Manacher / Two Pointers pattern CARDS, not a "Longest Palindromic Substring" result row.
function filterPatterns(patterns, { query, tiers }) {
  const q = query.trim().toLowerCase();
  return patterns.filter((p) => {
    const matchesQuery = !q || p.pattern.toLowerCase().includes(q) || p.titles?.some((t) => t.toLowerCase().includes(q));
    const matchesTier = !tiers.length || tiers.includes(tierOf(p.companiesSeenIn));
    return matchesQuery && matchesTier;
  });
}

// Fade-up stagger, same trick as CompanyBrowser.jsx - wraps PatternCard without touching it.
function AnimatedCard({ pattern, maxCompanies, index, noteSlug }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 12) * 0.02 }}
      style={{ height: '100%' }}
    >
      <PatternCard pattern={pattern} maxCompanies={maxCompanies} noteSlug={noteSlug} />
    </motion.div>
  );
}

function Section({ title, patterns, maxCompanies, collapsible }) {
  const [showAll, setShowAll] = useState(!collapsible);
  if (patterns.length === 0) return null;
  const visible = showAll ? patterns : patterns.slice(0, SECTION_COLLAPSED_COUNT);
  const hidden = patterns.length - visible.length;

  return (
    <>
      <h2 className={styles.sectionTitle}>{title} <span className={styles.sectionCount}>({patterns.length})</span></h2>
      <div className={styles.grid}>
        {visible.map((p, i) => (
          <AnimatedCard key={p.slug} pattern={p} maxCompanies={maxCompanies} index={i} noteSlug={PATTERN_NOTE_MAP[p.slug]} />
        ))}
      </div>
      {hidden > 0 && (
        <button className={styles.showMore} onClick={() => setShowAll(true)} type="button">
          Show {hidden} more &darr;
        </button>
      )}
    </>
  );
}

export default function PatternBrowser({ patterns }) {
  const [query, setQuery] = useState('');
  const [tiers, setTiers] = useState([]);

  const maxCompanies = Math.max(1, ...patterns.map((p) => p.companiesSeenIn));
  const isDefaultView = !query.trim() && tiers.length === 0;

  const toggleTier = (t) => setTiers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const visible = useMemo(() => filterPatterns(patterns, { query, tiers }), [patterns, query, tiers]);

  // Default view only: top 3 overall get the bento row, then the rest split into tier sections.
  const sorted = useMemo(() => [...patterns].sort((a, b) => b.companiesSeenIn - a.companiesSeenIn), [patterns]);
  const featured = sorted.slice(0, 3);
  const featuredSlugs = new Set(featured.map((p) => p.slug));
  const byTier = (value) => sorted.filter((p) => !featuredSlugs.has(p.slug) && tierOf(p.companiesSeenIn) === value);

  return (
    <>
      <div className={styles.controls}>
        <input
          className={styles.search}
          type="text"
          placeholder="Search a pattern or a problem name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search patterns"
        />
        <div className={styles.tierChips} role="group" aria-label="Filter by tier">
          {PATTERN_TIERS.map((t) => (
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
      </div>

      {isDefaultView ? (
        <>
          <div className={styles.featuredRow}>
            {featured.map((p, i) => (
              <PatternCard key={p.slug} pattern={p} maxCompanies={maxCompanies} rank={i + 1} noteSlug={PATTERN_NOTE_MAP[p.slug]} />
            ))}
          </div>
          <Section title="Core patterns" patterns={byTier('core')} maxCompanies={maxCompanies} collapsible={false} />
          <Section title="Extended" patterns={byTier('extended')} maxCompanies={maxCompanies} collapsible />
          <Section title="Advanced / CP" patterns={byTier('advanced')} maxCompanies={maxCompanies} collapsible />
        </>
      ) : (
        <>
          {visible.length === 0 && <div className={styles.emptyState}>No patterns match that search.</div>}
          {visible.length > 0 && (
            <div className={styles.grid}>
              {visible.map((p, i) => (
                <AnimatedCard key={p.slug} pattern={p} maxCompanies={maxCompanies} index={i} noteSlug={PATTERN_NOTE_MAP[p.slug]} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { patternSlug } from '../../../lib/patternSlug.js';
import { motion, AnimatePresence } from 'motion/react';
import { useFilters } from '../../../hooks/useFilters.js';
import { useDsaIndex } from '../../../hooks/useProblems.js';
import { buildPatternChips, searchChips } from '../../../lib/sidebarTags.js';
import { useAuthStore } from '../../../store/auth.store.js';
import { isAuthResolved } from '../../../lib/authGate.js';
import { DSA_TOPICS } from '../../../constants/topics.js';
import FilterChip from '../FilterChip/FilterChip.jsx';
import SearchBar from '../SearchBar/SearchBar.jsx';
import SortDropdown from '../SortDropdown/SortDropdown.jsx';
import styles from './FilterBar.module.css';

function Section({ label, count, children }) {
  const [open, setOpen] = useState(true);
  const bodyId = useId();

  return (
    <div className={styles.section}>
      <button type="button" className={styles.sectionHeader} aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((p) => !p)}>
        <span className={styles.sectionLabel}>{label}</span>
        <div className={styles.sectionMeta}>
          {count > 0 && <span className={styles.activeCount}>{count}</span>}
          <span className={styles.chevron} data-open={open}>›</span>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={styles.sectionBody}
            id={bodyId}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DifficultySlider({ value, onChange }) {
  const active = value !== '';
  const displayVal = active ? Number(value) : 1;
  const label = active ? `Difficulty ${displayVal}` : 'All';
  const pct = ((displayVal - 1) / 9) * 100;
  const trackStyle = active
    ? { background: `linear-gradient(to right, var(--accent) ${pct}%, var(--border-strong) ${pct}%)` }
    : {};

  return (
    <Section label="Difficulty" count={active ? 1 : 0}>
      <div className={styles.sliderBlock}>
        <div className={styles.sliderLabels}>
          <span>1</span>
          <span className={styles.sliderRange} data-active={active}>{label}</span>
          <span>10</span>
        </div>
        <input
          type="range"
          min="1" max="10" step="1"
          className={styles.slider}
          style={trackStyle}
          value={displayVal}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <div className={styles.diffScale}>
          <span className={styles.diffEasy}>Easy</span>
          <span className={styles.diffMed}>Med</span>
          <span className={styles.diffHard}>Hard</span>
        </div>
      </div>
    </Section>
  );
}

// Pattern chips (the /patterns page list). Multi-select: a problem must carry every selected pattern.
const CHIPS_COLLAPSED = 24;

function PatternSection({ filters, patchFilters }) {
  const { data: index, isLoading, isError } = useDsaIndex();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const chips = useMemo(() => buildPatternChips(index, DSA_TOPICS, DSA_TOPICS), [index]);
  const matches = useMemo(() => searchChips(chips, query), [chips, query]);

  const selected = filters.topics || [];
  const searching = query.trim() !== '';
  let visible = expanded || searching ? matches : matches.slice(0, CHIPS_COLLAPSED);
  // selected chips stay visible even below the collapsed cut-off
  const hidden = selected.filter((name) => !visible.some((c) => c.name === name));
  if (hidden.length) {
    visible = [...hidden.map((name) => chips.find((c) => c.name === name) || { name, count: 0 }), ...visible];
  }

  const toggle = (name) => {
    const next = selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name];
    patchFilters({ topics: next, page: 1 });
  };

  // the pattern page link only makes sense for a single selection
  const pageSlug = selected.length === 1 && DSA_TOPICS.includes(selected[0]) ? patternSlug(selected[0]) : null;

  return (
    <Section label="Pattern" count={selected.length}>
      {isLoading && <p className={styles.tagEmpty}>Loading patterns...</p>}
      {isError && <p className={styles.tagEmpty}>Couldn&apos;t load patterns. Try refreshing.</p>}
      {!isLoading && !isError && (
        <>
          <input
            type="search"
            className={styles.tagSearch}
            placeholder={`Search ${chips.length} patterns`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search patterns"
          />
          <div className={styles.chips}>
            {visible.map((c) => (
              <FilterChip key={c.name} label={c.name} count={c.count} active={selected.includes(c.name)} onClick={() => toggle(c.name)} />
            ))}
            {!searching && matches.length > CHIPS_COLLAPSED && (
              <button type="button" className={styles.showMoreBtn} onClick={() => setExpanded((p) => !p)}>
                {expanded ? '- Show less' : `+ ${matches.length - CHIPS_COLLAPSED} more`}
              </button>
            )}
          </div>
          {searching && matches.length === 0 && <p className={styles.tagEmpty}>No patterns match &quot;{query.trim()}&quot;.</p>}
        </>
      )}
      {pageSlug && (
        <Link href={`/patterns/${pageSlug}`} className={styles.patternLink}>
          Open the {selected[0]} pattern page &rarr;
        </Link>
      )}
    </Section>
  );
}

/* inDrawer prop - when true, renders inside the mobile FilterDrawer */
export default function FilterBar({ inDrawer = false }) {
  const { filters, setFilter, resetFilters, patchFilters } = useFilters();
  const isAuthed = useAuthStore((s) => !!s.user);
  const authResolved = useAuthStore((s) => isAuthResolved(s));
  // BUG-102: signed-out users can't get useful results from these, so the
  // options are disabled instead of silently returning "0 problems".
  const personalDisabled = authResolved && !isAuthed;

  const activeCount = [
    filters.topics?.length ? 1 : 0,
    filters.difficulty,
    filters.status,
  ].filter(Boolean).length;

  return (
    <aside className={styles.bar} data-in-drawer={inDrawer}>
      <div className={styles.barHeader}>
        <span className={styles.barTitle}>Filters</span>
        {!inDrawer && activeCount > 0 && (
          <button className={styles.clearAll} onClick={resetFilters}>
            Clear {activeCount}
          </button>
        )}
      </div>

      {!inDrawer && <SearchBar />}

      {inDrawer && activeCount > 0 && (
        <div style={{ padding: '0.75rem 1rem 0', display: 'flex', justifyContent: 'center' }}>
          <button className={styles.clearAll} onClick={resetFilters}>
            Clear {activeCount}
          </button>
        </div>
      )}

      <Section label="Status" count={filters.status ? 1 : 0}>
        <div className={styles.statusChips}>
          {[
            { val: 'solved',     label: 'Solved' },
            { val: 'attempted',  label: 'Attempted' },
            { val: 'unsolved',   label: 'Unsolved' },
            { val: 'bookmarked', label: 'Bookmarked' },
          ].map(({ val, label }) => (
            <button
              key={val}
              type="button"
              className={styles.statusChip}
              data-val={val}
              data-active={filters.status === val}
              aria-pressed={filters.status === val}
              disabled={personalDisabled}
              title={personalDisabled ? 'Sign in to filter by your progress' : undefined}
              onClick={() => setFilter('status', filters.status === val ? '' : val)}
            >
              {label}
            </button>
          ))}
        </div>
        {personalDisabled && (
          <p className={styles.statusHint}>Sign in to filter by your progress</p>
        )}
      </Section>

      <DifficultySlider
        value={filters.difficulty}
        onChange={(v) => setFilter('difficulty', v)}
      />

      <PatternSection filters={filters} patchFilters={patchFilters} />

      <div className={styles.bottom}>
        <SortDropdown value={filters.sort} onChange={(v) => setFilter('sort', v)} />
      </div>
    </aside>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFilters } from '../../../hooks/useFilters.js';
import { DSA_TOPICS, PROBLEM_PATTERNS } from '../../../constants/topics.js';
import FilterChip from '../FilterChip/FilterChip.jsx';
import SearchBar from '../SearchBar/SearchBar.jsx';
import SortDropdown from '../SortDropdown/SortDropdown.jsx';
import styles from './FilterBar.module.css';

function Section({ label, count, children }) {
  const [open, setOpen] = useState(true);

  return (
    <div className={styles.section}>
      <button className={styles.sectionHeader} onClick={() => setOpen((p) => !p)}>
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

/* Shows initialCount items, then a toggle to reveal the rest */
function TopicList({ items, active, onSelect, initialCount }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initialCount);
  const remaining = items.length - initialCount;

  return (
    <div className={styles.chips}>
      {visible.map((item) => (
        <FilterChip
          key={item}
          label={item}
          active={active === item}
          onClick={() => onSelect(item)}
        />
      ))}
      {items.length > initialCount && (
        <button
          className={styles.showMoreBtn}
          onClick={() => setExpanded((p) => !p)}
        >
          {expanded ? '− Show less' : `+ ${remaining} more`}
        </button>
      )}
    </div>
  );
}

/* inDrawer prop - when true, renders inside the mobile FilterDrawer */
export default function FilterBar({ inDrawer = false }) {
  const { filters, setFilter, resetFilters } = useFilters();

  const activeCount = [
    filters.topic,
    filters.pattern,
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
              className={styles.statusChip}
              data-val={val}
              data-active={filters.status === val}
              onClick={() => setFilter('status', filters.status === val ? '' : val)}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <DifficultySlider
        value={filters.difficulty}
        onChange={(v) => setFilter('difficulty', v)}
      />

      <Section label="Topic" count={filters.topic ? 1 : 0}>
        <TopicList
          items={DSA_TOPICS}
          active={filters.topic}
          onSelect={(t) => setFilter('topic', filters.topic === t ? '' : t)}
          initialCount={14}
        />
      </Section>

      <Section label="Pattern" count={filters.pattern ? 1 : 0}>
        <TopicList
          items={PROBLEM_PATTERNS}
          active={filters.pattern}
          onSelect={(p) => setFilter('pattern', filters.pattern === p ? '' : p)}
          initialCount={12}
        />
      </Section>

      <div className={styles.bottom}>
        <SortDropdown value={filters.sort} onChange={(v) => setFilter('sort', v)} />
      </div>
    </aside>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatTopicLabel, getCpTopics, UNTAGGED_TOPIC } from '../../../lib/codeforces.utils.js';
import styles from './TopicFilter.module.css';

/* 44 topics is too many for a flat chip row (see the redesign discussion - it'd either wrap into a
   wall of chips or force a scroll rail, both worse than just... a normal filter dropdown). This is a
   button that opens a searchable checklist popover, sorted by how many problems carry each topic so
   the common ones (Greedy, DP, Implementation) are right at the top without needing to search at all.
   Same click-outside/Escape pattern as FilterDrawer elsewhere in the app, just for a small popover
   instead of a full mobile sheet. */
export default function TopicFilter({ allProblems, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  // Real topics (most common first) plus how many rows carry no topic at all (141 today, see C6).
  const { topicCounts, untaggedCount } = useMemo(() => {
    const counts = new Map();
    let untagged = 0;
    for (const p of allProblems) {
      const topics = getCpTopics(p);
      if (topics.length === 0) untagged++;
      for (const t of topics) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return { topicCounts: [...counts.entries()].sort((a, b) => b[1] - a[1]), untaggedCount: untagged };
  }, [allProblems]);

  // "Untagged" leads the list when it exists, so those rows are discoverable (BUG-036 era untagged rows).
  const visibleTopics = useMemo(() => {
    const all = untaggedCount > 0 ? [[UNTAGGED_TOPIC, untaggedCount], ...topicCounts] : topicCounts;
    if (!query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter(([name]) => (name === UNTAGGED_TOPIC ? 'untagged' : name.toLowerCase()).includes(q));
  }, [topicCounts, untaggedCount, query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();

    const handleClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Untagged is exclusive: a row cannot be both "Graphs" and topic-less, so picking one side clears the other.
  const toggle = (topic) => {
    if (selected.includes(topic)) return onChange(selected.filter((t) => t !== topic));
    if (topic === UNTAGGED_TOPIC) return onChange([UNTAGGED_TOPIC]);
    onChange([...selected.filter((t) => t !== UNTAGGED_TOPIC), topic]);
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button className={styles.trigger} data-active={selected.length > 0} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Topics{selected.length > 0 ? ` (${selected.length})` : ''}
        <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label="Filter by topic">
          <input
            ref={searchRef}
            className={styles.search}
            type="text"
            placeholder="Search topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {/* always rendered, so opening the list and picking the first topic never shifts the rows below it */}
          <div className={styles.selectedRow}>
            <span aria-live="polite">{selected.length} selected</span>
            <button className={styles.clearBtn} onClick={() => onChange([])} disabled={selected.length === 0}>Clear</button>
          </div>
          <div className={styles.list}>
            {visibleTopics.length === 0 ? (
              <p className={styles.noMatch}>No topics match &quot;{query}&quot;.</p>
            ) : (
              visibleTopics.map(([topic, count]) => (
                <label key={topic} className={styles.item}>
                  <input
                    type="checkbox"
                    checked={selected.includes(topic)}
                    onChange={() => toggle(topic)}
                  />
                  <span className={styles.itemName}>{topic === UNTAGGED_TOPIC ? 'Untagged' : formatTopicLabel(topic)}</span>
                  <span className={styles.itemCount}>{count}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

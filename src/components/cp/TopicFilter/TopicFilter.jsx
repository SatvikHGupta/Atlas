import { useMemo } from 'react';
import { formatTopicLabel, getCpTopics, UNTAGGED_TOPIC } from '../../../lib/codeforces.utils.js';
import styles from './TopicFilter.module.css';

// All topics at once, most common first
export default function TopicFilter({ allProblems, selected, onChange }) {
  const topics = useMemo(() => {
    const counts = new Map();
    let untagged = 0;
    for (const p of allProblems) {
      const list = getCpTopics(p);
      if (list.length === 0) untagged++;
      for (const t of list) counts.set(t, (counts.get(t) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return untagged > 0 ? [[UNTAGGED_TOPIC, untagged], ...sorted] : sorted;
  }, [allProblems]);

  const toggle = (topic) => {
    if (selected.includes(topic)) return onChange(selected.filter((t) => t !== topic));
    if (topic === UNTAGGED_TOPIC) return onChange([UNTAGGED_TOPIC]);
    return onChange([...selected.filter((t) => t !== UNTAGGED_TOPIC), topic]);
  };

  return (
    <div className={styles.grid} role="group" aria-label="Filter by topic">
      {topics.map(([topic, count]) => (
        <button
          key={topic}
          type="button"
          className={styles.chip}
          data-active={selected.includes(topic)}
          aria-pressed={selected.includes(topic)}
          onClick={() => toggle(topic)}
        >
          {topic === UNTAGGED_TOPIC ? 'Untagged' : formatTopicLabel(topic)}
          <span className={styles.count}>{count}</span>
        </button>
      ))}
    </div>
  );
}

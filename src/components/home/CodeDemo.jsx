'use client';

// Two Sum "quick read / full breakdown" demo for the home page
import { useState } from 'react';
import styles from './CodeDemo.module.css';

const TABS = [
  { id: 'quick', label: 'Quick' },
  { id: 'full', label: 'Full breakdown' },
];

export default function CodeDemo() {
  const [tab, setTab] = useState('quick');

  return (
    <div className={styles.window}>
      <div className={styles.bar} role="tablist" aria-label="Two Sum explanation">
        <span className={styles.file}>two-sum.js</span>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={styles.tab}
            data-active={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'quick' ? (
        <pre className={styles.code} role="tabpanel"><code>
          <span className={styles.cm}>{'// optimal: one pass, O(n)\n'}</span>
          <span className={styles.kw}>const</span>{' seen = '}<span className={styles.kw}>new</span>{' Map();\n'}
          <span className={styles.kw}>for</span>{' ('}<span className={styles.kw}>let</span>{' i = 0; i < nums.length; i++) {\n'}
          {'  '}<span className={styles.kw}>const</span>{' need = target - nums[i];\n'}
          {'  '}<span className={styles.kw}>if</span>{' (seen.has(need)) '}<span className={styles.kw}>return</span>{' [seen.get(need), i];\n'}
          {'  seen.set(nums[i], i);\n}'}<span className={styles.cursor} aria-hidden="true" />
        </code></pre>
      ) : (
        <div className={styles.trace} role="tabpanel">
          <p className={styles.traceHead}>Dry run: nums = [2, 7, 11, 15], target = 9</p>
          <table className={styles.table}>
            <thead><tr><th>i</th><th>need</th><th>seen</th><th>result</th></tr></thead>
            <tbody>
              <tr><td>0</td><td>7</td><td>{'{}'}</td><td>store 2</td></tr>
              <tr><td>1</td><td>2</td><td>{'{2: 0}'}</td><td>found, return [0, 1]</td></tr>
            </tbody>
          </table>
          <p className={styles.traceNote}>Brute force checks every pair, O(n²). The map trades O(n) space for a single pass.</p>
        </div>
      )}
    </div>
  );
}

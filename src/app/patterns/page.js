import { getPatternIndex, getAllPatternIndexRows } from '../../lib/server/content.server.js';
import PatternBrowser from '../../components/pattern/PatternBrowser.jsx';
import { patternCounts } from '../../lib/patternTiers.js';
import styles from './PatternList.module.css';
import { routes, canonicalAlternates } from '../../lib/routeIdentity.js';

// Count comes from the actual data file, not a hand-typed number
export function generateMetadata() {
  const { canonicalPatternCount, visiblePatternCount, topicOnlyCount } = patternCounts(getPatternIndex(), getAllPatternIndexRows());
  return {
    alternates: canonicalAlternates(routes.patterns()),
    title: 'Patterns',
    description: `${canonicalPatternCount} interview patterns ranked by how many companies ask them, plus ${topicOnlyCount} more topic pages - each with a ready practice set.`,
  };
}

// flat "featured 3 + one grid of 163" replaced with data-driven tiers
export default function PatternsPage() {
  const patterns = getAllPatternIndexRows();
  const { visiblePatternCount } = patternCounts(getPatternIndex(), patterns);

  return (
    <div className={styles.page}>
      <div className={styles.headerGlow} aria-hidden="true" />
      <header className={styles.header}>
        <h1>Patterns Companies Ask</h1>
        <p className={styles.subtitle}>{visiblePatternCount} patterns ranked by how many companies ask them, the rest from problem topics</p>
      </header>

      <PatternBrowser patterns={patterns} />
    </div>
  );
}

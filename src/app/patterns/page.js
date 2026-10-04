import { getPatternIndex, getAllPatternIndexRows } from '../../lib/server/content.server.js';
import PatternBrowser from '../../components/pattern/PatternBrowser.jsx';
import { patternCounts } from '../../lib/patternTiers.js';
import styles from './PatternList.module.css';
import { routes, canonicalAlternates } from '../../lib/routeIdentity.js';

// Count comes from the actual data file, not a hand-typed number.
export function generateMetadata() {
  // ATLAS-BUG-011: the title count is what a visitor sees in the browser (visible); the "asked at companies" claim uses canonical.
  const { canonicalPatternCount, visiblePatternCount, topicOnlyCount } = patternCounts(getPatternIndex(), getAllPatternIndexRows());
  return {
    alternates: canonicalAlternates(routes.patterns()),
    title: `DSA Patterns (${visiblePatternCount}) - Atlas`,
    description: `${canonicalPatternCount} interview patterns ranked by how many companies ask them, plus ${topicOnlyCount} more topic pages - each with a ready practice set.`,
  };
}

// REMADE: flat "featured 3 + one grid of 163" replaced with data-driven tiers (see lib/patternTiers.js) -
// Core / Extended / Advanced sections, each collapsible, plus search + tier-chip filtering (same UX as
// CompanyBrowser.jsx on /companies). All interactive logic lives in PatternBrowser.jsx.
export default function PatternsPage() {
  const patterns = getAllPatternIndexRows(); // BUG-22: includes sidebar topics that have no company data
  const { canonicalPatternCount, visiblePatternCount } = patternCounts(getPatternIndex(), patterns);

  return (
    <div className={styles.page}>
      <div className={styles.headerGlow} aria-hidden="true" />
      <header className={styles.header}>
        <h1>Patterns Companies Ask</h1>
        <p className={styles.subtitle}>{visiblePatternCount} patterns - {canonicalPatternCount} ranked by how many companies ask them, the rest from problem topics</p>
      </header>

      <PatternBrowser patterns={patterns} />
    </div>
  );
}

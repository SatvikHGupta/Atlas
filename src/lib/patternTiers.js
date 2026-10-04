// Patterns don't have a hand-curated category (checked tag-taxonomy.json - not usable for this).
// Instead we bucket by companiesSeenIn, which naturally separates "real interview patterns"
// from "niche competitive-programming algorithms" - the data has a clean break around 40.
export const PATTERN_TIERS = [
  { value: 'core', label: 'Core', hint: 'Asked by 40+ companies - the actual interview patterns', min: 40 },
  { value: 'extended', label: 'Extended', hint: 'Asked by 15-39 companies - solid but less common', min: 15 },
  { value: 'advanced', label: 'Advanced / CP', hint: 'Under 15 companies - specialized or competitive-programming-only', min: 0 },
];

export function tierOf(companiesSeenIn) {
  return PATTERN_TIERS.find((t) => companiesSeenIn >= t.min)?.value || 'advanced';
}

/* ATLAS-BUG-011: two different numbers were being called "the number of patterns".
   canonicalPatternCount = patterns from the company pipeline (each has real "companies ask this" data, content/patterns/index.json).
   visiblePatternCount   = every card the browser shows = canonical + topic-only pages built from the DSA index (0 companies).
   Rule: anything that CLAIMS "asked at companies" uses canonical; anything that says how many things you can browse/see uses visible.
   Both come from the same two arrays, so they can never drift apart. */
export function patternCounts(canonicalRows, allRows) {
  const canonicalPatternCount = canonicalRows.length;
  const visiblePatternCount = allRows.length;
  return { canonicalPatternCount, visiblePatternCount, topicOnlyCount: visiblePatternCount - canonicalPatternCount };
}

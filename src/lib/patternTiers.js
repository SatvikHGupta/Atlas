// Patterns don't have a hand-curated category (checked tag-taxonomy.json - not usable for this)
export const PATTERN_TIERS = [
  { value: 'core', label: 'Core', hint: 'Asked by 40+ companies - the actual interview patterns', min: 40 },
  { value: 'extended', label: 'Extended', hint: 'Asked by 15-39 companies - solid but less common', min: 15 },
  { value: 'advanced', label: 'Advanced / CP', hint: 'Under 15 companies - specialized or competitive-programming-only', min: 0 },
];

export function tierOf(companiesSeenIn) {
  return PATTERN_TIERS.find((t) => companiesSeenIn >= t.min)?.value || 'advanced';
}

// two different numbers were being called "the number of patterns"
export function patternCounts(canonicalRows, allRows) {
  const canonicalPatternCount = canonicalRows.length;
  const visiblePatternCount = allRows.length;
  return { canonicalPatternCount, visiblePatternCount, topicOnlyCount: visiblePatternCount - canonicalPatternCount };
}

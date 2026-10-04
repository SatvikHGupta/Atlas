// Sidebar "Pattern" chips for the Problems page. Author: Satvik Hemant Gupta
//
// The chip list is DERIVED from the loaded DSA index instead of being a hand-kept constant, so a chip can never be
// empty: a tag only becomes a chip if at least one problem matches it, and the number shown on the chip is the number
// of rows the filter will return (same semantics as matchesPatternTag, which applyFilters uses - a test asserts they agree).
import { patternSlug } from './patternSlug.js';

/**
 * @param {Array} problems       slim DSA index rows (should_generate !== false)
 * @param {string[]} candidates  every tag name that is allowed to appear (pattern pages + Atlas section/technique tags)
 * @param {string[]} pageNames   names that have a /patterns/<slug> page (used for the "Open pattern page" link)
 * @returns {{name:string,count:number,hasPage:boolean,slug:string}[]} non-empty tags, biggest first, then A-Z
 */
export function buildPatternChips(problems, candidates, pageNames = []) {
  if (!Array.isArray(problems) || problems.length === 0) return [];
  const wanted = new Set(candidates);
  const pages = new Set(pageNames);
  const counts = new Map();

  // single pass over the index: each problem votes once per distinct tag it carries
  for (const p of problems) {
    if (p.should_generate === false) continue;
    const seen = new Set([...(p.patterns || []), ...(p.topics_display || [])]);
    for (const name of seen) {
      if (wanted.has(name)) counts.set(name, (counts.get(name) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .map(([name, count]) => ({ name, count, hasPage: pages.has(name), slug: patternSlug(name) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Case-insensitive "contains" filter for the little search box above the chips. */
export function searchChips(chips, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return chips;
  return chips.filter((c) => c.name.toLowerCase().includes(q));
}

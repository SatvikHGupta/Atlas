// Sidebar Pattern chips for the Problems page, derived from the loaded DSA index so a chip can never be empty.
// The count on a chip is the number of rows filters.topics returns for it (both read topics_display).
import { patternSlug } from './patternSlug.js';

/**
 * @param {Array} problems       slim DSA index rows
 * @param {string[]} candidates  tag names allowed to appear as chips
 * @param {string[]} pageNames   names that have a /patterns/<slug> page
 * @returns {{name:string,count:number,hasPage:boolean,slug:string}[]} non-empty tags, biggest first, then A-Z
 */
export function buildPatternChips(problems, candidates, pageNames = []) {
  return buildChips(problems, candidates, pageNames, (p) => p.topics_display ?? p.topics ?? []);
}

function buildChips(problems, candidates, pageNames, tagsOf) {
  if (!Array.isArray(problems) || problems.length === 0) return [];
  const wanted = new Set(candidates);
  const pages = new Set(pageNames);
  const counts = new Map();

  // single pass over the index: each problem votes once per distinct tag it carries
  for (const p of problems) {
    if (p.should_generate === false) continue;
    const seen = new Set(tagsOf(p));
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

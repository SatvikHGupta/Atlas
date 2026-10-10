// Sidebar Pattern chips for the Problems page
import { patternSlug } from './patternSlug.js';

export function buildPatternChips(problems, candidates, pageNames = []) {
  return buildChips(problems, candidates, pageNames, (p) => p.topics_display ?? p.topics ?? []);
}

function buildChips(problems, candidates, pageNames, tagsOf) {
  if (!Array.isArray(problems) || problems.length === 0) return [];
  const wanted = new Set(candidates);
  const pages = new Set(pageNames);
  const counts = new Map();

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

// Case-insensitive "contains" filter for the little search box above the chips
export function searchChips(chips, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return chips;
  return chips.filter((c) => c.name.toLowerCase().includes(q));
}

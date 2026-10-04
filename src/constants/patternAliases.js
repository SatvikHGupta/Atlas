// Pattern name aliases and slug resolver (contract C7). Author: Satvik Hemant Gupta
import { patternSlug } from '../lib/patternSlug.js';

// BUG-139: problem pattern names that differ from the canonical pattern slug.
// Every target was checked against the real pattern index.
export const PATTERN_ALIASES = {
  'String Manipulation': 'string',
  Hashing: 'hash-table',
  DFS: 'depth-first-search',
  BFS: 'breadth-first-search',
  'Two Pointer': 'two-pointers',
  'DFS on Trees': 'depth-first-search',
  'BFS on Trees': 'breadth-first-search',
  'String DP': 'dynamic-programming',
  'Bitmask DP': 'bitmask',
  'Fenwick Tree': 'binary-indexed-tree',
};

// Resolve a pattern name to an existing pattern page slug, or null.
// Order: exact slug match, then alias, else null (render a plain tag).
export function resolvePatternSlug(name, validSlugs) {
  const slugs = validSlugs instanceof Set ? validSlugs : new Set(validSlugs);
  const direct = patternSlug(name);
  if (direct && slugs.has(direct)) return direct;
  const alias = PATTERN_ALIASES[name];
  if (alias && slugs.has(alias)) return alias;
  return null;
}

// Pure URL <-> filter helpers for the Problems page. Author: Satvik Hemant Gupta
// BUG-105: q, topic (repeatable), difficulty, sort and page live in the URL.
// Personal status filters (solved, attempted, bookmarked) never do.

const VALID_SORTS = ['frequency', 'difficulty_asc', 'difficulty_desc', 'title_asc'];
const MAX_TEXT = 100;
const MAX_TOPICS = 12;

// Accepts a URLSearchParams, a query string, or a plain object.
function toParams(input) {
  if (input instanceof URLSearchParams) return input;
  if (input && typeof input === 'object' && typeof input.get === 'function') {
    return input; // ReadonlyURLSearchParams from next/navigation
  }
  if (typeof input === 'string') return new URLSearchParams(input);
  return new URLSearchParams(input || {});
}

const cleanText = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_TEXT) : '');

// Returns ONLY the keys that were present and valid. Unknown keys and bad
// values are ignored, so callers can safely spread the result over defaults.
export function parseFilterParams(input) {
  const p = toParams(input);
  const out = {};

  const q = cleanText(p.get('q'));
  if (q) out.search = q;

  // ?topic=Array&topic=Math, a single ?topic=Array still works
  const topics = [...new Set((p.getAll ? p.getAll('topic') : []).map(cleanText).filter(Boolean))].slice(0, MAX_TOPICS);
  if (topics.length) out.topics = topics;

  const diff = Number(p.get('difficulty'));
  if (Number.isInteger(diff) && diff >= 1 && diff <= 10) out.difficulty = diff;

  const sort = p.get('sort');
  if (sort && VALID_SORTS.includes(sort)) out.sort = sort;

  const rawPage = p.get('page');
  const page = Number(rawPage);
  if (rawPage && Number.isInteger(page) && page >= 1) out.page = page;

  return out;
}

// Serialise filters to a query string (no leading "?"). Defaults are omitted
// to keep URLs short. Status is deliberately never written.
export function buildFilterQuery(filters = {}) {
  const p = new URLSearchParams();
  if (filters.search) p.set('q', String(filters.search));
  for (const t of filters.topics || []) p.append('topic', t);
  if (filters.difficulty !== '' && filters.difficulty != null) {
    p.set('difficulty', String(filters.difficulty));
  }
  if (filters.sort && filters.sort !== 'frequency') p.set('sort', filters.sort);
  if (filters.page && Number(filters.page) > 1) {
    p.set('page', String(filters.page));
  }
  return p.toString();
}

const MANAGED_KEYS = ['q', 'topic', 'pattern', 'difficulty', 'sort', 'page'];

// Keeps any unrelated params (utm_*, etc.) and replaces the managed ones.
export function mergeFilterQuery(currentSearch, filters) {
  const cur = toParams(currentSearch);
  const next = new URLSearchParams();
  for (const [k, v] of cur.entries()) {
    if (!MANAGED_KEYS.includes(k)) next.append(k, v);
  }
  const mine = new URLSearchParams(buildFilterQuery(filters));
  for (const [k, v] of mine.entries()) next.append(k, v);
  return next.toString();
}

/**
 * Codeforces rating tiers, colors, and helpers for the CP page.
 *
 * DELIBERATELY not sourced from theme.css. CF's rating colors (gray/green/cyan/
 * blue/purple/orange/red) are a real-world convention every competitive
 * programmer already recognizes on sight from codeforces.com itself - a
 * "purple = Candidate Master" pill needs to stay purple regardless of which
 * Atlas theme (Frost/Ember/Meadow/Cream/Mono/Atlas) is active, because the
 * whole point is matching an external convention, not this site's own accent.
 * Hardcoded hex values here, independent of the app's own token system.
 */

import { getDisplayRating, getPrimaryMapping, getCpMappings } from './cpRating.js';

// Sentinel for the topic filter's "Untagged" option (rows with no topics).
export const UNTAGGED_TOPIC = '__untagged__';

// Ordered narrowest-first; used for both the rating pill (fine-grained, matches
// CF's own tier names) and the filter chips (same boundaries, coarser labels).
export const RATING_TIERS = [
  { max: 1199, key: 'newbie',     name: 'Newbie',              color: '#9CA3AF' },
  { max: 1399, key: 'pupil',      name: 'Pupil',                color: '#4ADE80' },
  { max: 1599, key: 'specialist', name: 'Specialist',           color: '#22D3D0' },
  { max: 1899, key: 'expert',     name: 'Expert',                color: '#4C8DFF' },
  { max: 2099, key: 'cm',         name: 'Candidate Master',      color: '#B266F0' },
  { max: 2399, key: 'master',     name: 'Master',                color: '#FFA23D' },
  { max: Infinity, key: 'gm',     name: 'Grandmaster',           color: '#FF5C5C' },
];

// BUG-188: label is derived from min/max so the two can never disagree.
// The first band starts at 0 (ratings below the lowest tier still land in it), so it reads "Up to 1199".
export function formatBandLabel(min, max) {
  if (max === Infinity) return `${min}+`;
  if (min <= 0) return `Up to ${max}`;
  return `${min}-${max}`;
}

// Coarser groupings for the filter chip row - same boundaries as the tiers above,
// so a chip's color always matches what the pills within it will actually show.
export const RATING_BANDS = [
  { key: 'unrated', label: 'Unrated', min: null, max: null, color: '#6B7280' },
  ...RATING_TIERS.map((t, i) => {
    const min = i === 0 ? 0 : RATING_TIERS[i - 1].max + 1;
    return { key: t.key, label: formatBandLabel(min, t.max), min, max: t.max, color: t.color };
  }),
];

/** Returns the tier object for a numeric rating, or null for Unrated/no rating. */
export function getRatingTier(rating) {
  if (rating == null) return null;
  return RATING_TIERS.find((t) => rating <= t.max) || null;
}

/**
 * A problem's display rating (BUG-038): the rating of the first Codeforces mapping that has one,
 * else null. Kept under the old name for existing callers; see lib/cpRating.js for the policy.
 */
export function getCfRating(problem) {
  return getDisplayRating(problem);
}

/** Every codeforces platform entry on a problem, for the multi-variant indicator. */
export function getAllCfPlatforms(problem) {
  return getCpMappings(problem);
}

/** URL of the primary mapping (first rated one, else first) - what the row/random-button link out to. */
export function getCfUrl(problem) {
  return getPrimaryMapping(problem)?.url || null;
}

/** Normalizes topic label casing for display - the raw data mixes CF-native lowercase ("bitmasks",
    "dsu", "*special") with already-Title-Case entries ("Two Pointer") depending on source. Strips a
    leading non-alphanumeric marker (the "*special" -> "special" case) and title-cases every word;
    idempotent on text that's already Title Case, so safe to apply to every topic unconditionally. */
// DATA-07: words that title-casing would mangle ("dsu" -> "Dsu", "fft" -> "Fft").
const TOPIC_LABELS = {
  dsu: 'DSU', fft: 'FFT', dfs: 'DFS', bfs: 'BFS', dp: 'DP', '2-sat': '2-SAT', lca: 'LCA', mst: 'MST',
  'meet-in-the-middle': 'Meet in the Middle',
};
export function formatTopicLabel(topic) {
  const stripped = String(topic).replace(/^[^a-zA-Z0-9]+/, '');
  const override = TOPIC_LABELS[stripped.toLowerCase()];
  if (override) return override;
  return stripped
    .split(' ')
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** True if `rating` falls within filter band `bandKey` (see RATING_BANDS). 'unrated' matches null ratings. */
export function matchesRatingBand(rating, bandKey) {
  if (!bandKey) return true;
  const band = RATING_BANDS.find((b) => b.key === bandKey);
  if (!band) return true;
  if (band.key === 'unrated') return rating == null;
  if (rating == null) return false;
  return rating >= band.min && rating <= band.max;
}

/** "1519B", "1519-B", "1519/B", " 1519 b " all become "1519b" (BUG-037). */
export function normalizeCpCode(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Normalized codes of every Codeforces mapping, e.g. ["1519b", "1520a"]. */
export function getCpCodes(problem) {
  return getCpMappings(problem).map((m) => normalizeCpCode(m.platform_id)).filter(Boolean);
}

/**
 * Search by title, or by the code of ANY Codeforces mapping (BUG-037). `_titleLower` / `_codes` are
 * optional precomputed fields (see CpProblemsClient) so 10k rows are not re-normalized per pass.
 */
export function matchesCpSearch(problem, query) {
  const raw = String(query ?? '').trim().toLowerCase();
  if (!raw) return true;
  const title = problem._titleLower ?? (problem.title || '').toLowerCase();
  if (title.includes(raw)) return true;
  const code = normalizeCpCode(raw);
  if (!code) return false; // query was only punctuation: never match every row by code
  return (problem._codes ?? getCpCodes(problem)).some((c) => c.includes(code));
}

/** Topics a row is tagged with (C6: may be an empty array for untagged rows). */
export function getCpTopics(problem) {
  return problem.topics_display ?? problem.topics ?? [];
}

/**
 * Multi-topic filter (AND across topics). The UNTAGGED_TOPIC sentinel matches rows with no
 * topics (141 of them) and is exclusive: the topic picker never mixes it with real topics.
 */
export function filterByTopics(problems, selected) {
  if (!selected?.length) return problems;
  if (selected.includes(UNTAGGED_TOPIC)) return problems.filter((p) => getCpTopics(p).length === 0);
  return problems.filter((p) => {
    const t = getCpTopics(p);
    return selected.every((wanted) => t.includes(wanted));
  });
}

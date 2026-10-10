// Codeforces rating tiers, colors, and helpers for the CP page

import { getDisplayRating, getPrimaryMapping, getCpMappings } from './cpRating.js';

export const UNTAGGED_TOPIC = '__untagged__';

export const RATING_TIERS = [
  { max: 1199, key: 'newbie',     name: 'Newbie',              color: '#9CA3AF' },
  { max: 1399, key: 'pupil',      name: 'Pupil',                color: '#4ADE80' },
  { max: 1599, key: 'specialist', name: 'Specialist',           color: '#22D3D0' },
  { max: 1899, key: 'expert',     name: 'Expert',                color: '#4C8DFF' },
  { max: 2099, key: 'cm',         name: 'Candidate Master',      color: '#B266F0' },
  { max: 2399, key: 'master',     name: 'Master',                color: '#FFA23D' },
  { max: Infinity, key: 'gm',     name: 'Grandmaster',           color: '#FF5C5C' },
];

// label is derived from min/max so the two can never disagree
export function formatBandLabel(min, max) {
  if (max === Infinity) return `${min}+`;
  if (min <= 0) return `Up to ${max}`;
  return `${min}-${max}`;
}

export const RATING_BANDS = [
  { key: 'unrated', label: 'Unrated', min: null, max: null, color: '#6B7280' },
  ...RATING_TIERS.map((t, i) => {
    const min = i === 0 ? 0 : RATING_TIERS[i - 1].max + 1;
    return { key: t.key, label: formatBandLabel(min, t.max), min, max: t.max, color: t.color };
  }),
];

// Returns the tier object for a numeric rating, or null for Unrated/no rating
export function getRatingTier(rating) {
  if (rating == null) return null;
  return RATING_TIERS.find((t) => rating <= t.max) || null;
}

// A problem's display rating the rating of the first Codeforces mapping
export function getCfRating(problem) {
  return getDisplayRating(problem);
}

// Every codeforces platform entry on a problem, for the multi-variant indicator
export function getAllCfPlatforms(problem) {
  return getCpMappings(problem);
}

// URL of the primary mapping
export function getCfUrl(problem) {
  return getPrimaryMapping(problem)?.url || null;
}

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

// Multi-select version: true when no band is picked
export function matchesRatingBands(rating, bandKeys) {
  if (!bandKeys || bandKeys.length === 0) return true;
  return bandKeys.some((k) => matchesRatingBand(rating, k));
}

// True if `rating` falls within filter band `bandKey` (see RATING_BANDS)
export function matchesRatingBand(rating, bandKey) {
  if (!bandKey) return true;
  const band = RATING_BANDS.find((b) => b.key === bandKey);
  if (!band) return true;
  if (band.key === 'unrated') return rating == null;
  if (rating == null) return false;
  return rating >= band.min && rating <= band.max;
}

// "1519B", "1519-B", "1519/B", " 1519 b " all become "1519b"
export function normalizeCpCode(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Normalized codes of every Codeforces mapping, e.g
export function getCpCodes(problem) {
  return getCpMappings(problem).map((m) => normalizeCpCode(m.platform_id)).filter(Boolean);
}

// Search by title, or by the code of ANY Codeforces mapping
export function matchesCpSearch(problem, query) {
  const raw = String(query ?? '').trim().toLowerCase();
  if (!raw) return true;
  const title = problem._titleLower ?? (problem.title || '').toLowerCase();
  if (title.includes(raw)) return true;
  const code = normalizeCpCode(raw);
  if (!code) return false;
  return (problem._codes ?? getCpCodes(problem)).some((c) => c.includes(code));
}

// Topics a row is tagged with ( may be an empty array for untagged rows)
export function getCpTopics(problem) {
  return problem.topics_display ?? problem.topics ?? [];
}

// Multi-topic filter (AND across topics)
export function filterByTopics(problems, selected) {
  if (!selected?.length) return problems;
  if (selected.includes(UNTAGGED_TOPIC)) return problems.filter((p) => getCpTopics(p).length === 0);
  return problems.filter((p) => {
    const t = getCpTopics(p);
    return selected.every((wanted) => t.includes(wanted));
  });
}

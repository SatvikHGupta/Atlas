// Adds question links the source dataset does not have, WITHOUT editing the dataset (same overlay idea as the tags overlay).
// Pure functions: scripts/build-content.mjs calls them, tests call them. Author: Satvik Hemant Gupta
import { toExternalUrl } from './urlPolicy.js';

export const OVERRIDE_PLATFORMS = new Set(['leetcode', 'geeksforgeeks', 'code360']);

/**
 * Validate the overrides file against the live rows. Throws one error listing every problem (a stale id or a bad URL must
 * fail the build, never silently ship a dead or unsafe link).
 * @param {Array} overrides   data/source-link-overrides.json -> overrides
 * @param {Array} rows        the dataset rows (need canonical_id, source_platforms)
 */
export function validateLinkOverrides(overrides, rows) {
  const byId = new Map(rows.map((r) => [r.canonical_id, r]));
  const seen = new Set();
  const errors = [];
  for (const o of overrides) {
    const label = `${o.title || o.canonical_id}`;
    if (!byId.has(o.canonical_id)) { errors.push(`${label}: canonical_id is not in the dataset`); continue; }
    if (seen.has(o.canonical_id)) errors.push(`${label}: listed twice`);
    seen.add(o.canonical_id);
    if (!OVERRIDE_PLATFORMS.has(o.platform)) errors.push(`${label}: unknown platform "${o.platform}"`);
    if (!toExternalUrl(o.url)) errors.push(`${label}: url is not a safe http(s) URL`);
    if (!o.platform_id) errors.push(`${label}: platform_id missing`);
    const existing = (byId.get(o.canonical_id).source_platforms || []).find((p) => p.platform === o.platform && p.url);
    if (existing) errors.push(`${label}: dataset already has a ${o.platform} link, the override is not needed`);
  }
  if (errors.length) throw new Error(`source-link-overrides.json is out of sync:\n  - ${errors.join('\n  - ')}`);
}

/** Returns the rows with override platforms appended (new objects; the input rows are not mutated). */
export function applyLinkOverrides(rows, overrides) {
  const byId = new Map(overrides.map((o) => [o.canonical_id, o]));
  return rows.map((row) => {
    const o = byId.get(row.canonical_id);
    if (!o) return row;
    const entry = { platform: o.platform, platform_id: o.platform_id, url: toExternalUrl(o.url), difficulty_original: null };
    return { ...row, source_platforms: [...(row.source_platforms || []), entry] };
  });
}

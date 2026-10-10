// Pure helpers for scripts/build-content.mjs (unit tested). Author: Satvik Hemant Gupta

export const CLEAN_TARGETS = [
  'content/problems',
  'content/solutions',
  'content/cp',
  'content/companies',
  'content/patterns',
  'content/tags',
  'content/notes',
  'public/data',
];

// Parse NDJSON text
export function parseNdjson(text, label) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed));
    } catch (err) {
      throw new Error(`${label}:${i + 1} malformed JSON line (${err.message})`);
    }
  }
  return rows;
}

// Build a Map keyed by `key`; a duplicate throws naming both rows
export function toStrictMap(rows, label, key = 'canonical_id') {
  const map = new Map();
  rows.forEach((row, i) => {
    const id = row[key];
    if (map.has(id)) {
      const first = map.get(id);
      throw new Error(
        `${label}: duplicate ${key} "${id}" ` +
          `(row ${first.index + 1}: ${describeRow(first.row)}, ` +
          `row ${i + 1}: ${describeRow(row)})`,
      );
    }
    map.set(id, { row, index: i });
  });
  return new Map([...map].map(([id, v]) => [id, v.row]));
}

// Throw if any value of `key` repeats across rows (used for slugs)
export function assertUniqueBy(rows, key, label) {
  const seen = new Map();
  rows.forEach((row, i) => {
    const value = row[key];
    if (seen.has(value)) {
      const first = seen.get(value);
      throw new Error(
        `${label}: duplicate ${key} "${value}" ` +
          `(row ${first.i + 1}: ${describeRow(first.row)}, ` +
          `row ${i + 1}: ${describeRow(row)})`,
      );
    }
    seen.set(value, { row, i });
  });
}

function describeRow(row) {
  return `${row.canonical_id ?? '?'} / ${row.slug ?? row.title ?? '?'}`;
}

const CHECK_KEY = {
  'javascript:algo': 'js_algo',
  'javascript:optimal': 'js_optimal',
  'python:algo': 'py_algo',
  'python:optimal': 'py_optimal',
};
const PASSING = new Set(['pass', 'pass_unordered']);
const KNOWN_BAD = new Set(['fail', 'unrunnable', 'error', 'timeout']);

export function pickDefaultSolution(solutions, checks = null) {
  const order = [
    ['javascript', 'algo'],
    ['javascript', 'optimal'],
    ['cpp', 'algo'],
    ['python', 'algo'],
    ['java', 'algo'],
    ['python', 'optimal'],
  ];
  const candidates = [];
  for (const [language, variant] of order) {
    const block = solutions[language];
    const code = block?.[`${variant}Code`];
    if (!code) continue;
    const status = checks ? checks[CHECK_KEY[`${language}:${variant}`]] : undefined;
    candidates.push({ language, variant, block, code, status });
  }
  const chosen = checks
    ? candidates.find((c) => PASSING.has(c.status))
      || candidates.find((c) => !KNOWN_BAD.has(c.status))
      || candidates[0]
    : candidates.find((c) => !(c.language === 'python' && c.variant === 'optimal')) || candidates[0];
  if (!chosen) return null;
  const { language, variant, block, code } = chosen;
  return {
    language,
    variant,
    code,
    codeHtml: block[`${variant}CodeHtml`] ?? null,
    complexity: block[`${variant}Complexity`] ?? null,
  };
}

// Roadmap curation
export function fillEmptyRoadmapTopics(rows, levels, getNoteSlugs) {
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const inUse = new Set(rows.filter((r) => r.is_atlas_roadmap).map((r) => `${r.roadmap_level}:${r.roadmap_topic}`));
  const filled = [];
  const stillEmpty = [];
  for (const { level, topicSlugs } of levels) {
    for (const topic of topicSlugs) {
      if (inUse.has(`${level}:${topic}`)) continue;
      const picks = [];
      for (const slug of getNoteSlugs(topic) || []) {
        const row = bySlug.get(slug);
        if (!row || row.is_atlas_roadmap || picks.includes(row)) continue;
        picks.push(row);
      }
      if (picks.length === 0) { stillEmpty.push(`${level}:${topic}`); continue; }
      picks.forEach((row, i) => {
        row.is_atlas_roadmap = true;
        row.roadmap_level = level;
        row.roadmap_topic = topic;
        row.roadmap_order = i + 1;
      });
      filled.push({ level, topic, count: picks.length });
    }
  }
  return { filled, stillEmpty };
}

// A roadmap row whose topic is not in the curated roadmap is invisible
export function clearRoadmapOutsideCurriculum(rows, levels) {
  const topics = new Set(levels.flatMap((l) => l.topicSlugs));
  const cleared = [];
  for (const row of rows) {
    if (!row.is_atlas_roadmap || topics.has(row.roadmap_topic)) continue;
    cleared.push(row.slug);
    row.is_atlas_roadmap = false;
    row.roadmap_level = null;
    row.roadmap_topic = null;
    row.roadmap_order = null;
  }
  return cleared;
}

// Missing required content, minus the accepted gaps
export function findContentProblems(rows, lookups, gaps) {
  const { quickLook, breakdown, jsAlgo, jsOpt } = lookups;
  const allowAlgo = new Set(gaps.js_algo_missing || []);
  const allowOpt = new Set(gaps.js_optimal_missing || []);
  const problems = [];
  for (const row of rows) {
    const id = row.canonical_id;
    if (!quickLook.has(id) || !breakdown.has(id)) {
      problems.push(`missing explanation (03 + 04 required): ${row.slug}`);
    }
    if (!jsAlgo.get(id)?.code && !allowAlgo.has(row.slug)) {
      problems.push(`missing JS algo solution, not allowlisted: ${row.slug}`);
    }
    if (!jsOpt.get(id)?.code && !allowOpt.has(row.slug)) {
      problems.push(
        `missing JS optimal solution, not allowlisted: ${row.slug}`,
      );
    }
  }
  return problems;
}

export function findStaleGaps(rows, lookups, gaps) {
  const { jsAlgo, jsOpt } = lookups;
  const bySlug = new Map(rows.map((r) => [r.slug, r.canonical_id]));
  const stale = [];
  for (const slug of gaps.js_algo_missing || []) {
    const id = bySlug.get(slug);
    if (!id || jsAlgo.get(id)?.code) stale.push(`js_algo_missing: ${slug}`);
  }
  for (const slug of gaps.js_optimal_missing || []) {
    const id = bySlug.get(slug);
    if (!id || jsOpt.get(id)?.code) stale.push(`js_optimal_missing: ${slug}`);
  }
  return stale;
}

// Lowercase, strip punctuation
export function normalizeTag(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/s$/, '');
}

// Prefer the spelling that looks more intentional
function displayCasing(a, b) {
  const score = (s) => (/[A-Z]/.test(s) ? 2 : 0) + (/^[A-Z]/.test(s) ? 1 : 0);
  return score(b) > score(a) ? b : a;
}

// CP topics_display union of topics and patterns
export function unionTopics(topics, patterns) {
  const byKey = new Map();
  for (const raw of [...(topics || []), ...(patterns || [])]) {
    const name = String(raw || '').trim();
    const key = normalizeTag(name);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, name);
    else byKey.set(key, displayCasing(byKey.get(key), name));
  }
  return [...byKey.values()];
}

// Drop CP rows listed in the exclusions file
export function applyCpExclusions(rows, exclusions) {
  const ids = new Set(exclusions.map((e) => e.canonical_id));
  const kept = rows.filter((r) => !ids.has(r.canonical_id));
  return { kept, removed: rows.length - kept.length };
}

// Remove excluded ids from list-shaped fields of a company or pattern JSON
export function scrubExcludedFromLists(data, excludedIds, fields) {
  let removed = 0;
  for (const field of fields) {
    if (!Array.isArray(data[field])) continue;
    const before = data[field].length;
    data[field] = data[field].filter(
      (item) =>
        !excludedIds.has(item?.atlasProblemId) &&
        !excludedIds.has(item?.canonical_id) &&
        !excludedIds.has(item?.id),
    );
    removed += before - data[field].length;
  }
  return removed;
}

// Topic names with at least one problem, from rows that carry topics_display
export function countTopicUse(rows) {
  const counts = new Map();
  for (const row of rows) {
    for (const tag of new Set(row.topics_display || [])) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return counts;
}

// Text of src/constants/tags.generated.js
export function renderTagsGenerated(taxonomy, topicCounts) {
  const topicNames = taxonomy.tags
    .filter((t) => t.kind === 'lc-topic' && (topicCounts.get(t.name) || 0) > 0)
    .map((t) => t.name)
    .sort();
  const patternNames = taxonomy.tags
    .filter((t) => t.kind !== 'lc-topic' && (topicCounts.get(t.name) || 0) > 0)
    .map((t) => t.name)
    .sort();
  const header =
    '// AUTO-GENERATED by scripts/build-content.mjs from raw-data/tags/tag-taxonomy.json on every `npm run build:content` - do not hand-edit, it will be overwritten.\n';
  return (
    `${header}export const DSA_TOPICS = ${JSON.stringify(topicNames, null, 2)};\n\n` +
    `export const PROBLEM_PATTERNS = ${JSON.stringify(patternNames, null, 2)};\n`
  );
}

// Names of lc-topic taxonomy tags that no problem uses
export function zeroUseTopics(taxonomy, topicCounts) {
  return taxonomy.tags
    .filter((t) => t.kind === 'lc-topic' && !(topicCounts.get(t.name) > 0))
    .map((t) => t.name)
    .sort();
}

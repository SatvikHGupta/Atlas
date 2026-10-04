// Pure helpers for scripts/build-content.mjs (unit tested). Author: Satvik Hemant Gupta

// Generated paths the build owns and wipes first (BUG-122, 126). Never raw-data.
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

// Parse NDJSON text. A malformed line throws with file:lineNumber (BUG-130).
export function parseNdjson(text, label) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  // Walk every line so the reported line number is the real one.
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

// Build a Map keyed by `key`; a duplicate throws naming both rows (BUG-133/134/135).
export function toStrictMap(rows, label, key = 'canonical_id') {
  const map = new Map();
  // Check each row against the ones already seen.
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

// Throw if any value of `key` repeats across rows (used for slugs).
export function assertUniqueBy(rows, key, label) {
  const seen = new Map();
  // Remember the first row per value and fail on the second.
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

// Default solution for a bundle (contract C5). Candidates in this order: JS algo, JS optimal, C++ algo, Python
// algo, Java algo, Python optimal. DATA-02: a candidate whose automated example check PASSED wins over an earlier one
// that failed, was unrunnable or only partly passed, so learners are not first shown code that fails its own
// examples. Preference tiers: 1) verified pass, 2) anything not known-bad, in the usual order (partial results and
// unverified C++/Java count as not-bad, so a linked-list problem whose checks are all 'partial' keeps its JS default),
// 3) anything.
// `checks` is the row's checks object (js_algo, js_optimal, py_algo, py_optimal); omit it for the old behaviour.
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

// ---- Roadmap curation (BUG-01, BUG-03) ---------------------------------------------------------------------
// The raw data flags only 81 problems as roadmap members, so 26 of the 52 curated topics had nothing in them (and two
// levels were completely empty). The notes already list problems per topic in teaching order, so an EMPTY topic is
// filled from its own note: the note's problems that exist in the catalogue and are not roadmap members yet, in note
// order. Topics that already have curated problems are never touched. Pure, mutates `rows`.
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

// A roadmap row whose topic is not in the curated roadmap is invisible on /roadmap but still says "Step 1 of 1" on
// its own page. Clear its roadmap fields instead (the topic is excluded on purpose, see constants/roadmap.js).
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

// Missing required content, minus the accepted gaps (BUG-112, 131, 132).
// Returns a list of human readable problems, empty when the data is fine.
export function findContentProblems(rows, lookups, gaps) {
  const { quickLook, breakdown, jsAlgo, jsOpt } = lookups;
  const allowAlgo = new Set(gaps.js_algo_missing || []);
  const allowOpt = new Set(gaps.js_optimal_missing || []);
  const problems = [];
  // One pass over every DSA row.
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

// Allowlisted slugs that are no longer gaps (stale allowlist entries).
export function findStaleGaps(rows, lookups, gaps) {
  const { jsAlgo, jsOpt } = lookups;
  const bySlug = new Map(rows.map((r) => [r.slug, r.canonical_id]));
  const stale = [];
  // A gap is stale when the slug is unknown or now has its solution.
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

// Lowercase, strip punctuation, drop a trailing "s" so "Two Pointers" and
// "Two Pointer" compare equal. Used for comparison only, never for display.
export function normalizeTag(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/s$/, '');
}

// Prefer the spelling that looks more intentional: keep existing casing
// when it has capitals, else title-case each word.
function displayCasing(a, b) {
  const score = (s) => (/[A-Z]/.test(s) ? 2 : 0) + (/^[A-Z]/.test(s) ? 1 : 0);
  return score(b) > score(a) ? b : a;
}

// CP topics_display (BUG-029, 031): union of topics and patterns, compared
// after normalising, shown with the best casing, de-duplicated. Nothing is
// dropped just because it also exists in the other list.
export function unionTopics(topics, patterns) {
  const byKey = new Map();
  // Topics first so their spelling wins ties, then patterns.
  for (const raw of [...(topics || []), ...(patterns || [])]) {
    const name = String(raw || '').trim();
    const key = normalizeTag(name);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, name);
    else byKey.set(key, displayCasing(byKey.get(key), name));
  }
  return [...byKey.values()];
}

// Drop CP rows listed in the exclusions file (BUG-033).
export function applyCpExclusions(rows, exclusions) {
  const ids = new Set(exclusions.map((e) => e.canonical_id));
  const kept = rows.filter((r) => !ids.has(r.canonical_id));
  return { kept, removed: rows.length - kept.length };
}

// Remove excluded ids from list-shaped fields of a company or pattern JSON.
// Returns the same object with the lists filtered and a count of removals.
export function scrubExcludedFromLists(data, excludedIds, fields) {
  let removed = 0;
  // Filter each list field by any of the id-like keys.
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

// Topic names with at least one problem, from rows that carry topics_display.
export function countTopicUse(rows) {
  const counts = new Map();
  // Tally every tag once per problem.
  for (const row of rows) {
    for (const tag of new Set(row.topics_display || [])) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return counts;
}

// Text of src/constants/tags.generated.js (BUG-035, 136). DSA_TOPICS lists
// only topics and patterns that have at least one problem.
export function renderTagsGenerated(taxonomy, topicCounts) {
  const topicNames = taxonomy.tags
    .filter((t) => t.kind === 'lc-topic' && (topicCounts.get(t.name) || 0) > 0)
    .map((t) => t.name)
    .sort();
  // A chip with zero problems would filter to an empty list, so it is dropped here too.
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

// Names of lc-topic taxonomy tags that no problem uses.
export function zeroUseTopics(taxonomy, topicCounts) {
  return taxonomy.tags
    .filter((t) => t.kind === 'lc-topic' && !(topicCounts.get(t.name) > 0))
    .map((t) => t.name)
    .sort();
}

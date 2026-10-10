// Pure content invariants, one function each (unit tested). Author: Satvik Hemant Gupta

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ok = () => ({ failures: [], warnings: [] });
const first = (list, n = 10) =>
  list.slice(0, n).join(', ') +
  (list.length > n ? `, ... (+${list.length - n})` : '');

// Ids in `expected` that are not in `actual`, and the reverse
function diffSets(expected, actual) {
  const exp = new Set(expected);
  const act = new Set(actual);
  return {
    missing: [...exp].filter((x) => !act.has(x)),
    extra: [...act].filter((x) => !exp.has(x)),
  };
}

export function checkProblemCounts({ indexSlugs, bundleSlugs, solutionSlugs }) {
  const out = ok();
  const pairs = [
    ['problem bundles', bundleSlugs],
    ['solution files', solutionSlugs],
  ];
  for (const [label, slugs] of pairs) {
    const { missing, extra } = diffSets(indexSlugs, slugs);
    if (missing.length)
      out.failures.push(`${label} missing for: ${first(missing)}`);
    if (extra.length) out.failures.push(`${label} orphaned: ${first(extra)}`);
    if (indexSlugs.length !== slugs.length) {
      out.failures.push(
        `index has ${indexSlugs.length} rows but ${slugs.length} ${label}`,
      );
    }
  }
  return out;
}

export function checkIndexMatchesFiles(label, indexIds, fileIds) {
  const out = ok();
  const { missing, extra } = diffSets(indexIds, fileIds);
  if (missing.length)
    out.failures.push(`${label}: index rows with no file: ${first(missing)}`);
  if (extra.length)
    out.failures.push(`${label}: orphan files not in index: ${first(extra)}`);
  return out;
}

export function checkNotes({ indexSlugs, files }) {
  const out = ok();
  const names = files.map((f) => f.file);
  const { missing, extra } = diffSets(indexSlugs, names);
  if (missing.length)
    out.failures.push(`notes: indexed topics with no file: ${first(missing)}`);
  if (extra.length)
    out.failures.push(
      `notes: files not in NOTES_TOPICS_INDEX: ${first(extra)}`,
    );
  for (const f of files) {
    if (f.slug !== f.file)
      out.failures.push(`notes: ${f.file}.json has slug "${f.slug}"`);
  }
  return out;
}

export function checkNoDuplicates(label, rows) {
  const out = ok();
  for (const key of ['canonical_id', 'slug']) {
    const seen = new Set();
    const dupes = new Set();
    for (const row of rows) {
      if (seen.has(row[key])) dupes.add(row[key]);
      seen.add(row[key]);
    }
    if (dupes.size)
      out.failures.push(`${label}: duplicate ${key}: ${first([...dupes])}`);
  }
  const badSlugs = rows
    .filter((r) => !SLUG.test(String(r.slug)))
    .map((r) => r.slug);
  if (badSlugs.length)
    out.failures.push(`${label}: non-canonical slugs: ${first(badSlugs)}`);
  return out;
}

export function checkPatternLinks({ dsaRows, patternSlugs, resolve }) {
  const out = ok();
  const valid = new Set(patternSlugs);
  const unresolved = new Map();
  for (const row of dsaRows) {
    for (const name of row.patterns || []) {
      const target = resolve(name, valid);
      if (target === null)
        unresolved.set(name, (unresolved.get(name) || 0) + 1);
      else if (!valid.has(target))
        out.failures.push(`pattern "${name}" -> missing page ${target}`);
    }
  }
  if (unresolved.size) {
    const list = [...unresolved].map(([n, c]) => `${n} (${c})`);
    out.failures.push(`unresolved pattern names: ${first(list)}`);
  }
  return out;
}

export function checkRedirects({ dsaRedirects, cpRedirects, dsaSlugs }) {
  const out = ok();
  const live = new Set(dsaSlugs);
  const sources = new Set([...Object.keys(dsaRedirects), ...cpRedirects]);
  for (const [from, to] of Object.entries(dsaRedirects)) {
    if (!live.has(to))
      out.failures.push(
        `redirect ${from} -> ${to}: destination is not a DSA slug`,
      );
    if (live.has(from))
      out.failures.push(`redirect source ${from} is a live slug (loop)`);
    if (sources.has(to))
      out.failures.push(
        `redirect ${from} -> ${to}: chain, ${to} is redirected too`,
      );
  }
  for (const key of cpRedirects) {
    if (live.has(key))
      out.failures.push(`CP redirect key ${key} is a live DSA slug`);
    if (key in dsaRedirects)
      out.failures.push(`CP redirect key ${key} also in DSA redirects`);
  }
  return out;
}

export function checkTopicChips({ dsaTopics, dsaRows }) {
  const out = ok();
  const used = new Set(dsaRows.flatMap((r) => r.topics_display || []));
  const empty = dsaTopics.filter((t) => !used.has(t));
  if (empty.length)
    out.failures.push(`topic chips with zero problems: ${first(empty)}`);
  return out;
}

export function checkCpIndex({ cpRows, exclusions }) {
  const out = ok();
  const excluded = new Set(exclusions.map((e) => e.canonical_id));
  const leaked = cpRows
    .filter((r) => excluded.has(r.canonical_id))
    .map((r) => r.canonical_id);
  if (leaked.length)
    out.failures.push(`CP index still has excluded ids: ${first(leaked)}`);
  const lost = cpRows.filter(
    (r) =>
      ((r.topics || []).length || (r.patterns || []).length) &&
      !(r.topics_display || []).length,
  );
  if (lost.length) {
    out.failures.push(
      `${lost.length} CP rows have topics/patterns but empty topics_display`,
    );
  }
  return out;
}

export function checkDefaultSolutions({ rows, gaps }) {
  const out = ok();
  const algoGaps = new Set(gaps.js_algo_missing || []);
  const optGaps = new Set(gaps.js_optimal_missing || []);
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  for (const r of rows) {
    if (!r.defaultSolution && !algoGaps.has(r.slug)) {
      out.failures.push(`no defaultSolution and not allowlisted: ${r.slug}`);
    }
    if (!r.hasJsAlgo && !algoGaps.has(r.slug))
      out.failures.push(`JS algo gap not allowlisted: ${r.slug}`);
    if (!r.hasJsOptimal && !optGaps.has(r.slug))
      out.failures.push(`JS optimal gap not allowlisted: ${r.slug}`);
  }
  for (const [list, field, name] of [
    [algoGaps, 'hasJsAlgo', 'js_algo_missing'],
    [optGaps, 'hasJsOptimal', 'js_optimal_missing'],
  ]) {
    for (const slug of list) {
      const row = bySlug.get(slug);
      if (!row) out.failures.push(`${name}: unknown slug ${slug}`);
      else if (row[field])
        out.failures.push(
          `${name}: ${slug} is no longer a gap (stale allowlist)`,
        );
    }
  }
  return out;
}

export function checkRoadmapTopics({
  dsaRows,
  roadmapTopicSlugs,
  levelsByTopic,
  knownOutside = ['mst'],
}) {
  const out = ok();
  const used = new Set(roadmapTopicSlugs);
  const outside = new Set(knownOutside);
  const found = new Set(dsaRows.map((r) => r.roadmap_topic).filter(Boolean));
  for (const topic of found) {
    if (used.has(topic)) continue;
    if (outside.has(topic))
      out.warnings.push(
        `roadmap_topic "${topic}" is outside the curated roadmap`,
      );
    else
      out.failures.push(
        `roadmap_topic "${topic}" is not in constants/roadmap.js`,
      );
  }
  if (levelsByTopic) {
    for (const row of dsaRows) {
      if (!row.roadmap_topic || outside.has(row.roadmap_topic)) continue;
      const declaredLevel = levelsByTopic.get(row.roadmap_topic);
      if (declaredLevel !== undefined && declaredLevel !== row.roadmap_level) {
        out.failures.push(
          `${row.slug}: roadmap_level ${row.roadmap_level} but topic "${row.roadmap_topic}" `
          + `is declared under level ${declaredLevel} in constants/roadmap.js`,
        );
      }
    }
  }
  return out;
}

// Merge several results into one
export function mergeResults(results) {
  return {
    failures: results.flatMap((r) => r.failures),
    warnings: results.flatMap((r) => r.warnings),
  };
}

export function checkRoadmapCoverage({ dsaRows, levels }) {
  const out = ok();
  const rows = dsaRows.filter((r) => r.is_atlas_roadmap);
  for (const { level, topicSlugs } of levels) {
    const empty = topicSlugs.filter((t) => !rows.some((r) => r.roadmap_level === level && r.roadmap_topic === t));
    if (empty.length) out.failures.push(`roadmap level ${level} has topics with no problems: ${first(empty)}`);
  }
  const seen = new Map();
  for (const r of rows) {
    const key = `${r.roadmap_level}:${r.roadmap_topic}:${r.roadmap_order}`;
    if (seen.has(key)) out.failures.push(`${r.slug} and ${seen.get(key)} share roadmap_order ${r.roadmap_order} in ${r.roadmap_topic}`);
    else seen.set(key, r.slug);
  }
  return out;
}

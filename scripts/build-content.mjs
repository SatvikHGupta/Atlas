#!/usr/bin/env node
// build-content.mjs - Phase 0 data reshape
import fs from 'node:fs';
import path from 'node:path';
import { createHighlighter } from 'shiki';
import { SHIKI_THEMES } from '../src/theme/shiki-themes.js';
import { NOTES_TOPICS_INDEX } from '../src/constants/notes.js';
import { ROADMAP_LEVELS } from '../src/constants/roadmap.js';
import {
  CLEAN_TARGETS, parseNdjson, toStrictMap, assertUniqueBy, pickDefaultSolution,
  fillEmptyRoadmapTopics, clearRoadmapOutsideCurriculum,
  findContentProblems, findStaleGaps, unionTopics, applyCpExclusions,
  scrubExcludedFromLists, countTopicUse, renderTagsGenerated, zeroUseTopics,
} from './lib/build-logic.mjs';
import { checkTagsGenerated } from './lib/tags-files.mjs';
import { validateLinkOverrides, applyLinkOverrides } from '../src/lib/linkOverrides.js';
import { withoutRetired, RETIRED_PROBLEMS } from '../src/constants/retiredProblems.js';

const SHIKI_LANG = { javascript: 'javascript', cpp: 'cpp', java: 'java', python: 'python' };
let highlighterPromise = null;
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: Object.values(SHIKI_THEMES),
      langs: Object.values(SHIKI_LANG),
    });
  }
  return highlighterPromise;
}
async function highlight(code, lang) {
  if (!code) return null;
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, { lang, themes: SHIKI_THEMES, defaultColor: false });
}

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
const [ocDir, companyDir] = args.filter((a) => !a.startsWith('--'));
const TAGS_GENERATED_FILE = path.join('src', 'constants', 'tags.generated.js');

if (CHECK_ONLY) {
  const problem = checkTagsGenerated(path.resolve('raw-data', 'tags'), TAGS_GENERATED_FILE);
  if (problem) { console.error(`CHECK FAILED: ${problem}`); process.exit(1); }
  console.log('tags.generated.js matches the taxonomy.');
  process.exit(0);
}

if (!ocDir || !companyDir) {
  console.error('Usage: node build-content.mjs <oc-split-dir> <company-problems-dir> | --check');
  process.exit(1);
}

const OUT = path.resolve('content');
const PUBLIC_DATA = path.resolve('public', 'data');

// a missing shard or a malformed line is a fatal error
async function readNdjson(file) {
  const full = path.join(ocDir, file);
  if (!fs.existsSync(full)) throw new Error(`required source file not found: ${full}`);
  return withoutRetired(parseNdjson(fs.readFileSync(full, 'utf8'), full));
}

const SLIM_FIELDS = [
  'canonical_id', 'title', 'slug', 'difficulty', 'difficulty_label',
  'topics', 'patterns', 'source_platforms', 'frequency_score',
  'is_atlas_roadmap', 'roadmap_level', 'roadmap_topic', 'roadmap_order',
  'should_generate', 'has_statement',
];

function toSlim(row, extra = {}) {
  const out = {};
  for (const f of SLIM_FIELDS) out[f] = row[f] ?? null;
  return { ...out, ...extra };
}

// Builds the nested {javascript, cpp, java, python} solution shape
async function buildSolutions(id, { jsAlgo, jsOpt, cppAlgo, cppOpt, javaAlgo, javaOpt, pyAlgo, pyOpt }) {
  const js = jsAlgo.get(id), jso = jsOpt.get(id);
  const ca = cppAlgo.get(id), co = cppOpt.get(id);
  const ja = javaAlgo.get(id), jo = javaOpt.get(id);
  const pa = pyAlgo.get(id), po = pyOpt.get(id);

  const [jsAlgoHtml, jsOptHtml, cppAlgoHtml, cppOptHtml, javaAlgoHtml, javaOptHtml, pyAlgoHtml, pyOptHtml] =
    await Promise.all([
      highlight(js?.code, 'javascript'), highlight(jso?.code, 'javascript'),
      highlight(ca?.code, 'cpp'), highlight(co?.code, 'cpp'),
      highlight(ja?.code, 'java'), highlight(jo?.code, 'java'),
      highlight(pa?.code, 'python'), highlight(po?.code, 'python'),
    ]);

  return {
    javascript: {
      algoCode: js?.code ?? null, algoCodeHtml: jsAlgoHtml, algoComplexity: js?.complexity ?? null,
      optimalCode: jso?.code ?? null, optimalCodeHtml: jsOptHtml, optimalComplexity: jso?.complexity ?? null,
    },
    cpp: { algoCode: ca?.code ?? null, algoCodeHtml: cppAlgoHtml, optimalCode: co?.code ?? null, optimalCodeHtml: cppOptHtml },
    java: { algoCode: ja?.code ?? null, algoCodeHtml: javaAlgoHtml, optimalCode: jo?.code ?? null, optimalCodeHtml: javaOptHtml },
    python: { algoCode: pa?.code ?? null, algoCodeHtml: pyAlgoHtml, optimalCode: po?.code ?? null, optimalCodeHtml: pyOptHtml },
  };
}

// Tags overlay (raw-data/tags/tags.ndjson + tag-taxonomy.json)
function loadTagsOverlay(tagsDir, liveCanonicalIds) {
  const tagsFile = path.join(tagsDir, 'tags.ndjson');
  const taxonomyFile = path.join(tagsDir, 'tag-taxonomy.json');
  for (const f of [tagsFile, taxonomyFile]) {
    if (!fs.existsSync(f)) throw new Error(`required source file not found: ${f}`);
  }
  const rows = withoutRetired(parseNdjson(fs.readFileSync(tagsFile, 'utf8'), tagsFile));
  const taxonomy = JSON.parse(fs.readFileSync(taxonomyFile, 'utf8'));
  const knownTagNames = new Set(taxonomy.tags.map((t) => t.name));

  const byId = toStrictMap(rows, tagsFile);
  let missingFromLive = 0, unknownTagRefs = 0;
  for (const row of rows) {
    if (!liveCanonicalIds.has(row.canonical_id)) { missingFromLive++; continue; }
    for (const t of row.tags) if (!knownTagNames.has(t)) unknownTagRefs++;
  }
  if (missingFromLive > 0) {
    throw new Error(`raw-data/tags/tags.ndjson: ${missingFromLive} row(s) reference a canonical_id not in the live dataset - the tags overlay is out of sync, regenerate it before building.`);
  }
  if (unknownTagRefs > 0) {
    throw new Error(`raw-data/tags/tags.ndjson: ${unknownTagRefs} tag reference(s) are not in tag-taxonomy.json - regenerate the overlay (node scripts/build-tags.mjs --strict in the tags handoff) before building.`);
  }
  return { byId, taxonomy };
}

// Notes overlay (raw-data/notes/*.json)
function buildNotesContent(notesDir, topicsIndex) {
  const outDir = path.join(OUT, 'notes');
  if (!fs.existsSync(notesDir)) throw new Error(`required source folder not found: ${notesDir}`);
  fs.mkdirSync(outDir, { recursive: true });
  const knownSlugs = new Set(topicsIndex.map((t) => t.slug));
  const files = fs.readdirSync(notesDir).filter((f) => f.endsWith('.json'));

  let filenameMismatch = 0, unknownSlug = 0;
  const seenSlugs = new Set();
  for (const file of files) {
    const filenameSlug = file.replace(/\.json$/, '');
    const note = JSON.parse(fs.readFileSync(path.join(notesDir, file), 'utf8'));
    if (note.slug !== filenameSlug) { filenameMismatch++; continue; }
    if (!knownSlugs.has(note.slug)) { unknownSlug++; continue; }
    seenSlugs.add(note.slug);
    fs.copyFileSync(path.join(notesDir, file), path.join(outDir, file));
  }
  if (filenameMismatch > 0) {
    throw new Error(`raw-data/notes/: ${filenameMismatch} file(s) whose internal "slug" field doesn't match their own filename - rename the file or fix the slug before building.`);
  }
  if (unknownSlug > 0) {
    throw new Error(`raw-data/notes/: ${unknownSlug} file(s) have a slug not present in NOTES_TOPICS_INDEX (src/constants/notes.js) - add the topic to the index, or remove the stray file, before building.`);
  }
  const missing = [...knownSlugs].filter((slug) => !seenSlugs.has(slug));
  if (missing.length > 0) {
    throw new Error(`raw-data/notes/: NOTES_TOPICS_INDEX lists ${missing.length} topic(s) with no file: ${missing.join(', ')}`);
  }
  return { count: seenSlugs.size };
}

// wipe exactly the generated paths (never raw-data) and say
function cleanGenerated() {
  for (const target of CLEAN_TARGETS) {
    const full = path.resolve(target);
    if (fs.existsSync(full)) {
      fs.rmSync(full, { recursive: true, force: true });
      console.log(`  removed ${target}`);
    }
  }
}

function buildAskedAtIndex(companyDir) {
  const map = new Map();
  if (!companyDir || !fs.existsSync(companyDir)) return map;

  const askedAtFile = path.join(companyDir, 'asked-at.json');
  const indexFile = path.join(companyDir, 'index.json');
  if (fs.existsSync(askedAtFile) && fs.existsSync(indexFile)) {
    const companies = new Map(JSON.parse(fs.readFileSync(indexFile, 'utf-8')).map((c) => [c.id, c]));
    for (const [pid, list] of Object.entries(JSON.parse(fs.readFileSync(askedAtFile, 'utf-8')))) {
      map.set(pid, list.map(([id]) => {
        const c = companies.get(id);
        return { name: c?.name || id, id, domain: c?.domain || null, logo: c?.logo || null };
      }));
    }
    return map;
  }

  const companiesDir = path.join(companyDir, 'companies');
  if (!fs.existsSync(companiesDir)) return map;
  for (const file of fs.readdirSync(companiesDir)) {
    if (!file.endsWith('.json') || file === 'index.json') continue;
    const data = JSON.parse(fs.readFileSync(path.join(companiesDir, file), 'utf-8'));
    for (const p of data.problems || []) {
      if (!p.atlasProblemId) continue;
      if (!map.has(p.atlasProblemId)) map.set(p.atlasProblemId, []);
      map.get(p.atlasProblemId).push({ name: data.name, id: file.replace(/\.json$/, ''), domain: data.domain || null });
    }
  }
  return map;
}

async function main() {
  console.log(`Reading NDJSON files... (${RETIRED_PROBLEMS.length} retired problems are dropped)`);
  const [statements, codeIndex, quickLook, breakdown,
    jsAlgoRows, jsOptRows, cppAlgoRows, cppOptRows,
    javaAlgoRows, javaOptRows, pyAlgoRows, pyOptRows] = await Promise.all([
    readNdjson('01-statements-only.json'),
    readNdjson('02-code-bearing-index.json'),
    readNdjson('03-quick-look.json'),
    readNdjson('04-algo-breakdown.json'),
    readNdjson('06-code-js-algo.json'),
    readNdjson('07-code-js-optimal.json'),
    readNdjson('08-code-cpp-algo.json'),
    readNdjson('09-code-cpp-optimal.json'),
    readNdjson('10-code-java-algo.json'),
    readNdjson('11-code-java-optimal.json'),
    readNdjson('12-code-python-algo.json'),
    readNdjson('13-code-python-optimal.json'),
  ]);

  const dsaLabel = path.join(ocDir, '02-code-bearing-index.json');
  const cpLabel = path.join(ocDir, '01-statements-only.json');
  toStrictMap(codeIndex, dsaLabel);
  assertUniqueBy(codeIndex, 'slug', dsaLabel);

  {
    const file = path.resolve('data', 'source-link-overrides.json');
    if (fs.existsSync(file)) {
      const { overrides } = JSON.parse(fs.readFileSync(file, 'utf8'));
      validateLinkOverrides(overrides, codeIndex);
      const patched = applyLinkOverrides(codeIndex, overrides);
      patched.forEach((row, i) => { codeIndex[i] = row; });
      console.log(`  Link overrides applied: ${overrides.length} (data/source-link-overrides.json)`);
    }
  }
  toStrictMap(statements, cpLabel);
  assertUniqueBy(statements, 'slug', cpLabel);
  const quickLookMap = toStrictMap(quickLook, path.join(ocDir, '03-quick-look.json'));
  const breakdownMap = toStrictMap(breakdown, path.join(ocDir, '04-algo-breakdown.json'));
  const codeMaps = {
    jsAlgo: toStrictMap(jsAlgoRows, '06-code-js-algo.json'),
    jsOpt: toStrictMap(jsOptRows, '07-code-js-optimal.json'),
    cppAlgo: toStrictMap(cppAlgoRows, '08-code-cpp-algo.json'),
    cppOpt: toStrictMap(cppOptRows, '09-code-cpp-optimal.json'),
    javaAlgo: toStrictMap(javaAlgoRows, '10-code-java-algo.json'),
    javaOpt: toStrictMap(javaOptRows, '11-code-java-optimal.json'),
    pyAlgo: toStrictMap(pyAlgoRows, '12-code-python-algo.json'),
    pyOpt: toStrictMap(pyOptRows, '13-code-python-optimal.json'),
  };

  const gaps = JSON.parse(fs.readFileSync(path.join('scripts', 'known-content-gaps.json'), 'utf8'));
  const contentProblems = findContentProblems(codeIndex, {
    quickLook: quickLookMap, breakdown: breakdownMap, jsAlgo: codeMaps.jsAlgo, jsOpt: codeMaps.jsOpt,
  }, gaps);
  if (contentProblems.length > 0) {
    const shown = contentProblems.slice(0, 50).join('\n  ');
    const more = contentProblems.length > 50 ? `\n  ... and ${contentProblems.length - 50} more` : '';
    throw new Error(`content check failed (${contentProblems.length} problem(s)):\n  ${shown}${more}`);
  }
  const staleGaps = findStaleGaps(codeIndex, {
    jsAlgo: codeMaps.jsAlgo, jsOpt: codeMaps.jsOpt,
  }, gaps);

  const noteProblemSlugs = (topic) => {
    try {
      const note = JSON.parse(fs.readFileSync(path.resolve('raw-data', 'notes', `${topic}.json`), 'utf8'));
      return (note.sections || []).flatMap((s) => (s.type === 'problems' ? (s.items || []).map((i) => i.slug) : [])).filter(Boolean);
    } catch {
      return [];
    }
  };
  const clearedRoadmap = clearRoadmapOutsideCurriculum(codeIndex, ROADMAP_LEVELS);
  const roadmapFill = fillEmptyRoadmapTopics(codeIndex, ROADMAP_LEVELS, noteProblemSlugs);
  console.log(`Roadmap: filled ${roadmapFill.filled.length} empty topics (${roadmapFill.filled.reduce((n, f) => n + f.count, 0)} problems), cleared ${clearedRoadmap.length} outside the curriculum, ${roadmapFill.stillEmpty.length} still empty.`);

  console.log('Cleaning generated output...');
  cleanGenerated();

  fs.mkdirSync(path.join(OUT, 'problems'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'solutions'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'cp'), { recursive: true });

  console.log('Copying notes content...');
  const notesResult = buildNotesContent(path.resolve('raw-data', 'notes'), NOTES_TOPICS_INDEX);

  const askedAtIndex = buildAskedAtIndex(companyDir);

  console.log(`Building ${codeIndex.length} DSA problem bundles...`);
  const dsaSlim = [];
  const warnings = [];
  const allowlistedGapsHit = { js_algo_missing: [], js_optimal_missing: [] };
  let overlayFallbacks = 0;

  const tagsOverlay = loadTagsOverlay(path.resolve('raw-data', 'tags'), new Set(codeIndex.map((r) => r.canonical_id)));
  function getTopicsDisplay(id, row) {
    const overlay = tagsOverlay.byId.get(id);
    if (overlay) return overlay.tags;
    overlayFallbacks++;
    return unionTopics(row.topics, row.patterns);
  }

  for (const row of codeIndex) {
    const id = row.canonical_id;
    const ql = quickLookMap.get(id);
    const bd = breakdownMap.get(id);

    const solutions = await buildSolutions(id, codeMaps);
    if (!solutions.javascript.algoCode) allowlistedGapsHit.js_algo_missing.push(row.slug);
    if (!solutions.javascript.optimalCode) allowlistedGapsHit.js_optimal_missing.push(row.slug);

    const bundle = {
      canonical_id: id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      description_source: row.description_source,
      gfg_url: row.gfg_url,
      constraints: row.constraints,
      examples: row.examples,
      difficulty: row.difficulty,
      difficulty_label: row.difficulty_label,
      topics: row.topics,
      topics_display: getTopicsDisplay(id, row),
      patterns: row.patterns,
      company_tags: row.company_tags,
      source_platforms: row.source_platforms,
      frequency_score: row.frequency_score,
      is_atlas_roadmap: row.is_atlas_roadmap,
      roadmap_level: row.roadmap_level,
      roadmap_topic: row.roadmap_topic,
      roadmap_order: row.roadmap_order,
      should_generate: true,
      has_statement: row.has_statement,
      aliases: row.aliases || [],
      explanation_short: ql?.explanation_short ?? null,
      explanation_long: bd?.explanation_long ?? null,
      explanation_long_status: bd?.explanation_long_status ?? null,
      checks: row.checks || null,
      defaultSolution: pickDefaultSolution(solutions, row.checks || null),
      askedAt: askedAtIndex.get(id) || [],
    };

    fs.writeFileSync(
      path.join(OUT, 'problems', `${row.slug}.json`),
      JSON.stringify(bundle),
    );
    fs.writeFileSync(
      path.join(OUT, 'solutions', `${row.slug}.json`),
      JSON.stringify(solutions),
    );
    dsaSlim.push(toSlim(row, { checks: row.checks || null, topics_display: getTopicsDisplay(id, row) }));
  }

  fs.writeFileSync(path.join(OUT, 'problems', 'index.json'), JSON.stringify(dsaSlim));

  const cpExclusions = JSON.parse(fs.readFileSync(path.join('scripts', 'cp-exclusions.json'), 'utf8'));
  console.log(`Building CP index (${statements.length} rows)...`);
  const { kept: cpRows, removed: cpRemoved } = applyCpExclusions(statements, cpExclusions);
  if (cpRemoved !== cpExclusions.length) {
    warnings.push(`cp-exclusions.json lists ${cpExclusions.length} ids but ${cpRemoved} matched a CP row`);
  }
  const cpSlim = cpRows.map((row) => toSlim(row, { topics_display: unionTopics(row.topics, row.patterns) }));
  fs.writeFileSync(path.join(OUT, 'cp', 'index.json'), JSON.stringify(cpSlim));

  const excludedIds = new Set(cpExclusions.map((e) => e.canonical_id));
  let scrubbed = 0;
  console.log('Copying company + pattern data...');
  fs.cpSync(path.join(companyDir, 'companies'), path.join(OUT, 'companies'), { recursive: true });
  fs.cpSync(path.join(companyDir, 'patterns'), path.join(OUT, 'patterns'), { recursive: true });
  fs.cpSync(path.join(companyDir, 'index.json'), path.join(OUT, 'companies', 'index.json'));
  for (const [dir, field] of [['companies', 'problems'], ['patterns', 'practiceProblems']]) {
    for (const file of fs.readdirSync(path.join(OUT, dir))) {
      if (!file.endsWith('.json') || file === 'index.json') continue;
      const full = path.join(OUT, dir, file);
      const data = JSON.parse(fs.readFileSync(full, 'utf8'));
      const removed = scrubExcludedFromLists(data, excludedIds, [field]);
      if (removed > 0) { fs.writeFileSync(full, JSON.stringify(data, null, 2)); scrubbed += removed; }
    }
  }

  fs.mkdirSync(PUBLIC_DATA, { recursive: true });
  fs.copyFileSync(path.join(OUT, 'problems', 'index.json'), path.join(PUBLIC_DATA, 'problems-index.json'));
  fs.copyFileSync(path.join(OUT, 'cp', 'index.json'), path.join(PUBLIC_DATA, 'cp-index.json'));
  fs.cpSync(path.join(OUT, 'companies'), path.join(PUBLIC_DATA, 'company-problems', 'companies'), { recursive: true });
  fs.cpSync(path.join(OUT, 'patterns'), path.join(PUBLIC_DATA, 'company-problems', 'patterns'), { recursive: true });
  fs.copyFileSync(path.join(OUT, 'companies', 'index.json'), path.join(PUBLIC_DATA, 'company-problems', 'index.json'));

  fs.mkdirSync(path.join(OUT, 'tags'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'tags', 'taxonomy.json'), JSON.stringify(tagsOverlay.taxonomy));

  const topicCounts = countTopicUse(dsaSlim);
  const tagsText = renderTagsGenerated(tagsOverlay.taxonomy, topicCounts);
  const currentTags = fs.existsSync(TAGS_GENERATED_FILE) ? fs.readFileSync(TAGS_GENERATED_FILE, 'utf8') : null;
  const tagsFileChanged = currentTags !== tagsText;
  if (tagsFileChanged) fs.writeFileSync(TAGS_GENERATED_FILE, tagsText);
  const hiddenTopics = zeroUseTopics(tagsOverlay.taxonomy, topicCounts);

  if (overlayFallbacks > 0) warnings.push(`${overlayFallbacks} DSA row(s) had no tags overlay entry and used unionTopics()`);
  if (staleGaps.length > 0) warnings.push(`stale known-content-gaps entries: ${staleGaps.join(', ')}`);
  const withAskedAt = dsaSlim.filter((_, i) => codeIndex[i] && askedAtIndex.has(codeIndex[i].canonical_id)).length;
  const companyCount = JSON.parse(fs.readFileSync(path.join(OUT, 'companies', 'index.json'), 'utf8')).length;
  const patternCount = JSON.parse(fs.readFileSync(path.join(OUT, 'patterns', 'index.json'), 'utf8')).length;
  const report = {
    counts: {
      dsaProblems: dsaSlim.length,
      dsaBundles: dsaSlim.length,
      dsaSolutionFiles: dsaSlim.length,
      cpProblems: cpSlim.length,
      companies: companyCount,
      patterns: patternCount,
      notes: notesResult.count,
    },
    allowlistedGapsHit,
    cpExclusionsApplied: cpRemoved,
    excludedIdsScrubbedFromCompanyPatternLists: scrubbed,
    roadmap: { filledTopics: roadmapFill.filled, clearedOutsideCurriculum: clearedRoadmap, stillEmpty: roadmapFill.stillEmpty },
    topicsWithNoProblems: hiddenTopics,
    tagsGeneratedRewritten: tagsFileChanged,
    warnings,
  };
  fs.mkdirSync(path.join(OUT, '_meta'), { recursive: true });
  fs.writeFileSync(path.join(OUT, '_meta', 'build-report.json'), JSON.stringify(report, null, 2));

  console.log('\nDone.');
  console.log(`  DSA problems:        ${dsaSlim.length} (bundles + 1 slim index)`);
  console.log(`  CP-only problems:    ${cpSlim.length} (${cpRemoved} excluded, slim index only, no per-page bundle)`);
  console.log(`  Allowlisted gaps:    JS algo ${allowlistedGapsHit.js_algo_missing.length}, JS optimal ${allowlistedGapsHit.js_optimal_missing.length}`);
  console.log(`  Companies / patterns: ${companyCount} / ${patternCount}`);
  console.log(`  Problems with "asked at" company links: ${withAskedAt}`);
  console.log(`  Tags overlay coverage: ${tagsOverlay.byId.size}/${codeIndex.length} DSA problems (raw-data/tags/tags.ndjson)`);
  console.log(`  Topics with no problems (hidden from DSA_TOPICS): ${hiddenTopics.length}`);
  console.log(`  Notes:                ${notesResult.count}/${NOTES_TOPICS_INDEX.length} (content/notes/, from raw-data/notes/)`);
  for (const w of warnings) console.warn(`  WARNING: ${w}`);

  const slimBytes = Buffer.byteLength(JSON.stringify(dsaSlim));
  const cpBytes = Buffer.byteLength(JSON.stringify(cpSlim));
  console.log(`  problems/index.json: ${(slimBytes / 1024).toFixed(1)} KB uncompressed`);
  console.log(`  cp/index.json:       ${(cpBytes / 1024).toFixed(1)} KB uncompressed`);
}

main().catch((err) => { console.error(err); process.exit(1); });

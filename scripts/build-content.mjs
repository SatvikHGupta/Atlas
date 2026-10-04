#!/usr/bin/env node
/* build-content.mjs - Phase 0 data reshape. Input: the corrected 12-file NDJSON dataset (atlas-oc-clean + the regen/recheck pass on top of it). This REPLACES problems.json (44.5MB) and oc.json (66.7MB) - nothing in the new site fetches those two files again, they're retired. Output (all under content/, read via fs at build time by Next.js server components - never shipped to the client as one blob): content/problems/index.json        - slim listing, DSA (should_generate:true) only content/problems/<slug>.json       - one full bundle per DSA problem (~3KB each) content/cp/index.json              - slim listing, CP/CF-only (should_generate:false) Company + pattern data is already in the right shape (see atlas-company-problems/README.md) - this script just copies it into content/companies and content/patterns unchanged. Run: node scripts/build-content.mjs <path-to-oc-split-dir> <path-to-company-problems-dir>. STRICT: the build first wipes its generated paths (see CLEAN_TARGETS in scripts/lib/build-logic.mjs), fails on missing or malformed source files, duplicate ids and missing content (except scripts/known-content-gaps.json), and writes content/_meta/build-report.json. `--check` only verifies src/constants/tags.generated.js. */
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

// BUG FIX / dep cleanup: the old app shipped the full react-syntax-highlighter Prism bundle to the client for exactly this (SolutionViewer + NoteReader). Highlighting solution code at BUILD time instead means: zero highlighter JS in the client bundle, and the HTML ships pre-rendered inside the static page - a pure SSG win, not just a dependency swap. NoteReader's markdown-embedded code blocks are highlighted client-side (language varies per fence, decided at read time) on the server via notesMarkdown.server.js - not covered by this script.
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

// BUG-136: `--check` only verifies the committed tags.generated.js, builds nothing.
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
// Slim indexes + company/pattern data are also small enough to serve directly to the client (see services/content/dataClient.js) - copied into public/data/ as a final step below. Per-problem bundles stay server-only (content/problems/<slug>.json), never copied to public/.
const PUBLIC_DATA = path.resolve('public', 'data');

// BUG-129, 130: a missing shard or a malformed line is a fatal error.
async function readNdjson(file) {
  const full = path.join(ocDir, file);
  if (!fs.existsSync(full)) throw new Error(`required source file not found: ${full}`);
  // retired problems (src/constants/retiredProblems.js) are dropped from EVERY shard here, before anything else sees a row
  return withoutRetired(parseNdjson(fs.readFileSync(full, 'utf8'), full));
}

// Fields that go into the slim listing (problems list / filter / sort / search) - small enough to load in full client-side, no pagination round-trip needed. This is what makes the status-filter-after-pagination bug structurally impossible: the client has the WHOLE filtered universe in memory, so status filtering (which needs per-user Firestore progress, so it can never be baked in statically) always runs before slicing a page, never after.
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

// Builds the nested {javascript, cpp, java, python} solution shape. This used to happen at RENDER time in ProblemDetail.jsx (a reshape hack on every page view) - now it happens once, at build time, and ships already-nested. complexity only ever exists for JS (data limitation confirmed during the correctness pass, not something this reshape can invent) - cpp/java/python objects simply omit the complexity key.
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

// BUG-029, 031: the old dedupeTopics(topics, patterns) dropped a topic whenever a pattern of the same name existed. The CP UI has no separate pattern filter, so 1,346 CP rows ended up with an empty topics_display. Both DSA and CP now use unionTopics() (scripts/lib/build-logic.mjs): the union of topics and patterns, compared after normalising, nothing dropped. DSA rows normally take the tags overlay below instead.

// Tags overlay (raw-data/tags/tags.ndjson + tag-taxonomy.json) - the merged, canonical LeetCode+Atlas tag set produced by the tags handoff, joined on canonical_id, never editing the verified dataset itself. Throws at build time if a row references a canonical_id this dataset doesn't have, or a tag name the taxonomy doesn't have - both would mean the overlay has drifted out of sync with the live dataset.
function loadTagsOverlay(tagsDir, liveCanonicalIds) {
  const tagsFile = path.join(tagsDir, 'tags.ndjson');
  const taxonomyFile = path.join(tagsDir, 'tag-taxonomy.json');
  // BUG-129: the overlay is required, a missing file is fatal (no silent fallback).
  for (const f of [tagsFile, taxonomyFile]) {
    if (!fs.existsSync(f)) throw new Error(`required source file not found: ${f}`);
  }
  const rows = withoutRetired(parseNdjson(fs.readFileSync(tagsFile, 'utf8'), tagsFile)); // same retired filter as the shards
  const taxonomy = JSON.parse(fs.readFileSync(taxonomyFile, 'utf8'));
  const knownTagNames = new Set(taxonomy.tags.map((t) => t.name));

  // BUG-135: a repeated canonical_id in the overlay throws, naming both rows.
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

// Notes overlay (raw-data/notes/*.json) - one JSON file per note, copied through to content/notes/ unchanged (never edited in place - raw-data/notes/ is the source of truth, content/notes/ is build output, same split as the tags overlay above). Throws at build time if a file's slug doesn't match its own filename, or if a slug has no matching entry in NOTES_TOPICS_INDEX (constants/notes.js) - either would mean a note exists that the roadmap doesn't know about, or vice versa, and getNotesIndex()'s ready/total counts would silently be wrong.
function buildNotesContent(notesDir, topicsIndex) {
  const outDir = path.join(OUT, 'notes');
  // BUG-129: notes are required, a missing source folder is fatal.
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
  // BUG-127: every indexed topic must have its file too.
  const missing = [...knownSlugs].filter((slug) => !seenSlugs.has(slug));
  if (missing.length > 0) {
    throw new Error(`raw-data/notes/: NOTES_TOPICS_INDEX lists ${missing.length} topic(s) with no file: ${missing.join(', ')}`);
  }
  return { count: seenSlugs.size };
}

// BUG-122, 126: wipe exactly the generated paths (never raw-data) and say so.
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
  const map = new Map(); // canonical_id -> [{name, id, domain}]
  if (!companyDir || !fs.existsSync(companyDir)) return map;

  // Preferred: asked-at.json (written by scripts/build-companies.mjs) is built from each company's WHOLE pool.
  // Deriving it from companies/*.json would only see each company's top-30 list and undercount.
  const askedAtFile = path.join(companyDir, 'asked-at.json');
  const indexFile = path.join(companyDir, 'index.json');
  if (fs.existsSync(askedAtFile) && fs.existsSync(indexFile)) {
    // No cap here on purpose - build-companies.mjs stopped truncating askedAt for the same reason (a popular
    // problem asked at 40 companies should say so); CompanyChipRow.jsx is what truncates to "top 4 + N more" for
    // display, so the data stays complete and any future consumer isn't stuck with whatever limit this file picked.
    const companies = new Map(JSON.parse(fs.readFileSync(indexFile, 'utf-8')).map((c) => [c.id, c]));
    for (const [pid, list] of Object.entries(JSON.parse(fs.readFileSync(askedAtFile, 'utf-8')))) {
      map.set(pid, list.map(([id]) => {
        const c = companies.get(id);
        return { name: c?.name || id, id, domain: c?.domain || null, logo: c?.logo || null };
      }));
    }
    return map;
  }

  // Fallback (old behaviour): only companies whose top list contains the problem.
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

  // BUG-133, 134: duplicate canonical_id/slug in any shard throws, naming both rows.
  const dsaLabel = path.join(ocDir, '02-code-bearing-index.json');
  const cpLabel = path.join(ocDir, '01-statements-only.json');
  toStrictMap(codeIndex, dsaLabel);
  assertUniqueBy(codeIndex, 'slug', dsaLabel);

  // Question links the dataset lacks (data/source-link-overrides.json). Validated against the live rows, then appended to
  // source_platforms IN PLACE so every output below (bundles, slim indexes) sees them. The raw dataset file is untouched.
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

  // BUG-112, 131, 132: missing explanations or JS solutions fail the build,
  // except the slugs accepted in scripts/known-content-gaps.json.
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

  // ---- Roadmap curation (BUG-01 / BUG-03): fill empty topics from their notes, drop flags outside the curriculum ----
  const noteProblemSlugs = (topic) => {
    try {
      const note = JSON.parse(fs.readFileSync(path.resolve('raw-data', 'notes', `${topic}.json`), 'utf8'));
      return (note.sections || []).flatMap((s) => (s.type === 'problems' ? (s.items || []).map((i) => i.slug) : [])).filter(Boolean);
    } catch {
      return []; // note missing (e.g. a test fixture): the topic stays empty and validate-content reports it
    }
  };
  const clearedRoadmap = clearRoadmapOutsideCurriculum(codeIndex, ROADMAP_LEVELS);
  const roadmapFill = fillEmptyRoadmapTopics(codeIndex, ROADMAP_LEVELS, noteProblemSlugs);
  console.log(`Roadmap: filled ${roadmapFill.filled.length} empty topics (${roadmapFill.filled.reduce((n, f) => n + f.count, 0)} problems), cleared ${clearedRoadmap.length} outside the curriculum, ${roadmapFill.stillEmpty.length} still empty.`);

  // Everything is read and validated: now wipe the old output and regenerate.
  console.log('Cleaning generated output...');
  cleanGenerated();

  fs.mkdirSync(path.join(OUT, 'problems'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'solutions'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'cp'), { recursive: true });

  // ---- Notes: copy raw-data/notes/ -> content/notes/, validated against NOTES_TOPICS_INDEX ----
  console.log('Copying notes content...');
  const notesResult = buildNotesContent(path.resolve('raw-data', 'notes'), NOTES_TOPICS_INDEX);

  // Internal-linking sweep: "Asked at: Amazon, Google" on problem pages. Built once here from the company data (reverse of the join the company pages already do the other way - problem -> companies instead of company -> problems), so no client-side lookup or extra fetch is ever needed on a problem page.
  const askedAtIndex = buildAskedAtIndex(companyDir);

  // ---- DSA / code-bearing problems (should_generate: true) ---------------
  console.log(`Building ${codeIndex.length} DSA problem bundles...`);
  const dsaSlim = [];
  const warnings = [];
  const allowlistedGapsHit = { js_algo_missing: [], js_optimal_missing: [] };
  let overlayFallbacks = 0;

  // Tags handoff overlay (raw-data/tags/) - see loadTagsOverlay's doc comment. Falls back to unionTopics per-row if a problem has no overlay entry (should not happen once the overlay is in sync; every fallback is counted in the build report, not silent - loadTagsOverlay already throws on real drift).
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
    // Record the accepted gaps this row hits, for the build report.
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
      // Honest-quality signal (see CORRECTIONS_REPORT.md / regen-recheck report) - safe to ship publicly. The raw verify_algo/verify_optimal fields are NOT included here: they're a stale pre-fix snapshot and were explicitly flagged "don't ship to public payload".
      checks: row.checks || null,
      // PERFORMANCE FIX (found by actually measuring page weight, not just trusting a successful build): passing the FULL `solutions` object (all 4 languages x 2 variants, each carrying pre-highlighted Shiki HTML) as a prop straight into the 'use client' SolutionViewer meant Next.js had to serialize all 8 blocks into every problem page's hydration payload, even though only one is ever visible at first paint. The heaviest real page (basic-calculator-iv) was 461KB - 98% of that was code-block HTML for 7 languages/variants nobody was looking at yet. Only the default tab's block ships inline now (`defaultSolution`, tiny); the rest lives in its own file (below) and SolutionViewer fetches it lazily, once, only if a visitor actually switches tabs - see services/content/dataClient.js.
      // C5: first available of JS algo, JS optimal, C++ algo, Python algo, Java algo (null only for allowlisted gaps).
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

  // ---- CP / statement-only problems (should_generate: false) --------------
  // BUG-029, 031: topics_display is the union of topics and patterns, nothing dropped.
  // BUG-033: the known-bad rows are dropped here instead of hidden in the browser.
  const cpExclusions = JSON.parse(fs.readFileSync(path.join('scripts', 'cp-exclusions.json'), 'utf8'));
  console.log(`Building CP index (${statements.length} rows)...`);
  const { kept: cpRows, removed: cpRemoved } = applyCpExclusions(statements, cpExclusions);
  if (cpRemoved !== cpExclusions.length) {
    warnings.push(`cp-exclusions.json lists ${cpExclusions.length} ids but ${cpRemoved} matched a CP row`);
  }
  const cpSlim = cpRows.map((row) => toSlim(row, { topics_display: unionTopics(row.topics, row.patterns) }));
  fs.writeFileSync(path.join(OUT, 'cp', 'index.json'), JSON.stringify(cpSlim));

  // ---- Company + pattern data: copy through, minus excluded ids -------------
  const excludedIds = new Set(cpExclusions.map((e) => e.canonical_id));
  let scrubbed = 0;
  console.log('Copying company + pattern data...');
  fs.cpSync(path.join(companyDir, 'companies'), path.join(OUT, 'companies'), { recursive: true });
  fs.cpSync(path.join(companyDir, 'patterns'), path.join(OUT, 'patterns'), { recursive: true });
  fs.cpSync(path.join(companyDir, 'index.json'), path.join(OUT, 'companies', 'index.json'));
  // Drop excluded ids from each company/pattern list (reasoned, not run on real data).
  for (const [dir, field] of [['companies', 'problems'], ['patterns', 'practiceProblems']]) {
    for (const file of fs.readdirSync(path.join(OUT, dir))) {
      if (!file.endsWith('.json') || file === 'index.json') continue;
      const full = path.join(OUT, dir, file);
      const data = JSON.parse(fs.readFileSync(full, 'utf8'));
      const removed = scrubExcludedFromLists(data, excludedIds, [field]);
      if (removed > 0) { fs.writeFileSync(full, JSON.stringify(data, null, 2)); scrubbed += removed; }
    }
  }

  // ---- Publish the client-fetchable copies ---------------------------------
  fs.mkdirSync(PUBLIC_DATA, { recursive: true });
  fs.copyFileSync(path.join(OUT, 'problems', 'index.json'), path.join(PUBLIC_DATA, 'problems-index.json'));
  fs.copyFileSync(path.join(OUT, 'cp', 'index.json'), path.join(PUBLIC_DATA, 'cp-index.json'));
  fs.cpSync(path.join(OUT, 'companies'), path.join(PUBLIC_DATA, 'company-problems', 'companies'), { recursive: true });
  fs.cpSync(path.join(OUT, 'patterns'), path.join(PUBLIC_DATA, 'company-problems', 'patterns'), { recursive: true });
  fs.copyFileSync(path.join(OUT, 'companies', 'index.json'), path.join(PUBLIC_DATA, 'company-problems', 'index.json'));

  // Tag taxonomy (raw-data/tags/tag-taxonomy.json) - published as-is for any future consumer; the existing /patterns pages above are still generated from the company-problems pipeline (they carry a companiesSeenIn count this taxonomy alone can't produce - that needs the company data, a separate workstream). This is not wired into any page yet.
  fs.mkdirSync(path.join(OUT, 'tags'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'tags', 'taxonomy.json'), JSON.stringify(tagsOverlay.taxonomy));

  // BUG this closes: src/constants/topics.js's DSA_TOPICS/PROBLEM_PATTERNS were a hand-maintained list, last written before the tags handoff - they still had 'Two Pointer', 'Hashing', 'BFS', 'DFS' as their own chips even though tag-taxonomy.json already treats those as aliases (folded into 'Two Pointers', 'Hash Table', 'Breadth-First Search', 'Depth-First Search'). Clicking one of those stale chips filtered against topics_display, which never contains the alias spelling anymore - zero results, silently. Generated here instead, from the same taxonomy tags.ndjson is joined against, so the sidebar can't drift out of sync with the tag data again. kind 'lc-topic' -> Topic section; 'atlas-technique' + 'atlas-section' -> Pattern section - both kinds carry real per-problem tags, so neither is dropped.
  // BUG-035: DSA_TOPICS only lists topics with at least one problem, so no chip shows zero results.
  // BUG-136: the file is written only when its content changed, so a normal build never dirties the working tree.
  const topicCounts = countTopicUse(dsaSlim);
  const tagsText = renderTagsGenerated(tagsOverlay.taxonomy, topicCounts);
  const currentTags = fs.existsSync(TAGS_GENERATED_FILE) ? fs.readFileSync(TAGS_GENERATED_FILE, 'utf8') : null;
  const tagsFileChanged = currentTags !== tagsText;
  if (tagsFileChanged) fs.writeFileSync(TAGS_GENERATED_FILE, tagsText);
  const hiddenTopics = zeroUseTopics(tagsOverlay.taxonomy, topicCounts);

  // ---- Report ---------------------------------------------------------------
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

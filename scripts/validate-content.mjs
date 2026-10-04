#!/usr/bin/env node
// Validates the generated content against every invariant. Author: Satvik Hemant Gupta
//
// Run after `npm run build:content` (npm run build does this for you).
// Exits non-zero when any invariant fails, so a bad build cannot ship.
import fs from 'node:fs';
import path from 'node:path';
import { NOTES_TOPICS_INDEX } from '../src/constants/notes.js';
import { ROADMAP_LEVELS } from '../src/constants/roadmap.js';
import { DSA_TOPICS } from '../src/constants/tags.generated.js';
import { resolvePatternSlug } from '../src/constants/patternAliases.js';
import {
  checkProblemCounts,
  checkIndexMatchesFiles,
  checkNotes,
  checkNoDuplicates,
  checkPatternLinks,
  checkRedirects,
  checkTopicChips,
  checkCpIndex,
  checkDefaultSolutions,
  checkRoadmapTopics,
  checkRoadmapCoverage,
  mergeResults,
} from './lib/invariants.mjs';
import { checkTagsGenerated } from './lib/tags-files.mjs';

const CONTENT = path.resolve('content');
const readJson = (...parts) =>
  JSON.parse(fs.readFileSync(path.join(...parts), 'utf8'));
// Slugs of the *.json files in a folder, ignoring index.json.
const fileIds = (dir) =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => f.replace(/\.json$/, ''));

if (!fs.existsSync(path.join(CONTENT, 'problems', 'index.json'))) {
  console.error('content/ is missing. Run "npm run build:content" first.');
  process.exit(1);
}

const dsaRows = readJson(CONTENT, 'problems', 'index.json');
const cpRows = readJson(CONTENT, 'cp', 'index.json');
const companyIndex = readJson(CONTENT, 'companies', 'index.json');
const patternIndex = readJson(CONTENT, 'patterns', 'index.json');
const gaps = readJson('scripts', 'known-content-gaps.json');
const exclusions = readJson('scripts', 'cp-exclusions.json');
const dsaRedirects = readJson('data', 'slug-redirects.json');
const cpRedirects = readJson('data', 'slug-redirects-cp.json');
const dsaSlugs = dsaRows.map((r) => r.slug);

// Per-problem facts from the bundle and solution files.
const solutionRows = dsaRows.map((row) => {
  const bundle = readJson(CONTENT, 'problems', `${row.slug}.json`);
  const solutions = readJson(CONTENT, 'solutions', `${row.slug}.json`);
  return {
    slug: row.slug,
    defaultSolution: bundle.defaultSolution,
    hasJsAlgo: Boolean(solutions.javascript?.algoCode),
    hasJsOptimal: Boolean(solutions.javascript?.optimalCode),
  };
});

// Note files: their own slug field must equal the filename.
const noteFiles = fileIds(path.join(CONTENT, 'notes')).map((file) => ({
  file,
  slug: readJson(CONTENT, 'notes', `${file}.json`).slug,
}));

const checks = [
  [
    '1 problem counts',
    checkProblemCounts({
      indexSlugs: dsaSlugs,
      bundleSlugs: fileIds(path.join(CONTENT, 'problems')),
      solutionSlugs: fileIds(path.join(CONTENT, 'solutions')),
    }),
  ],
  [
    '2a companies',
    checkIndexMatchesFiles(
      'companies',
      companyIndex.map((c) => c.id),
      fileIds(path.join(CONTENT, 'companies')),
    ),
  ],
  [
    '2b patterns',
    checkIndexMatchesFiles(
      'patterns',
      patternIndex.map((p) => p.slug),
      fileIds(path.join(CONTENT, 'patterns')),
    ),
  ],
  [
    '3 notes',
    checkNotes({
      indexSlugs: NOTES_TOPICS_INDEX.map((t) => t.slug),
      files: noteFiles,
    }),
  ],
  ['4a duplicates DSA', checkNoDuplicates('DSA', dsaRows)],
  ['4b duplicates CP', checkNoDuplicates('CP', cpRows)],
  [
    '5 pattern links',
    checkPatternLinks({
      dsaRows,
      patternSlugs: patternIndex.map((p) => p.slug),
      resolve: resolvePatternSlug,
    }),
  ],
  ['6 redirects', checkRedirects({ dsaRedirects, cpRedirects, dsaSlugs })],
  ['7 topic chips', checkTopicChips({ dsaTopics: DSA_TOPICS, dsaRows })],
  ['8 CP index', checkCpIndex({ cpRows, exclusions })],
  ['9 default solutions', checkDefaultSolutions({ rows: solutionRows, gaps })],
  [
    '10 roadmap topics',
    checkRoadmapTopics({
      dsaRows,
      roadmapTopicSlugs: ROADMAP_LEVELS.flatMap((l) => l.topicSlugs),
      levelsByTopic: new Map(
        ROADMAP_LEVELS.flatMap((l) => l.topicSlugs.map((slug) => [slug, l.level])),
      ),
    }),
  ],
  ['12 roadmap coverage', checkRoadmapCoverage({ dsaRows, levels: ROADMAP_LEVELS })],
];

// 11. tags.generated.js must match what the build would generate.
const tagsProblem = checkTagsGenerated(
  path.resolve('raw-data', 'tags'),
  path.join('src', 'constants', 'tags.generated.js'),
);
checks.push([
  '11 tags.generated.js',
  {
    failures: tagsProblem ? [tagsProblem] : [],
    warnings: [],
  },
]);

// Print one line per invariant, then the details.
for (const [name, result] of checks) {
  const status = result.failures.length ? 'FAIL' : 'ok  ';
  console.log(`${status} ${name}`);
}
const { failures, warnings } = mergeResults(checks.map(([, r]) => r));
for (const w of warnings) console.warn(`WARNING: ${w}`);
for (const f of failures) console.error(`FAILURE: ${f}`);
console.log(
  `\n${dsaRows.length} DSA, ${cpRows.length} CP, ` +
    `${companyIndex.length} companies, ${patternIndex.length} patterns, ` +
    `${noteFiles.length} notes.`,
);
if (failures.length) {
  console.error(`${failures.length} invariant failure(s).`);
  process.exit(1);
}
console.log('All content invariants pass.');

/* Server-only content access - fs reads against the content/ directory produced by scripts/build-content.mjs (Phase 0 data reshape). This is the ONLY place that knows the on-disk layout, mirroring the old dataClient.js's "single module owns the file paths" rule. Everything here runs at build time (generateStaticParams / a Server Component rendered during `next build`) - never shipped to the client, never fetched over the network. This is what replaces the old 66.7MB oc.json fetch-the-whole-file-for-one-problem pattern: one fs.readFileSync of a ~3KB per-problem file. */
import fs from 'node:fs';
import path from 'node:path';
import { ROADMAP_LEVELS } from '../../constants/roadmap.js';
import { NOTES_TOPICS_INDEX } from '../../constants/notes.js';
import { DSA_TOPICS } from '../../constants/tags.generated.js';
import { patternSlug } from '../patternSlug.js';
import { isValidSlug } from '../slugValidation.js';
import { getStarLevel } from '../noteLevels.js';

// ATLAS_CONTENT_DIR lets tests and scripts point at a fixture folder.
const contentDir = () => process.env.ATLAS_CONTENT_DIR || path.join(process.cwd(), 'content');

let dsaIndexCache = null;
let cpIndexCache = null;
let companyIndexCache = null;
let patternIndexCache = null;
let dsaSlugSet = null;
let companyIdSet = null;
let patternSlugSet = null;
let noteSlugCache = null;

/** Test helper: forget every cached index so a new fixture folder is read. */
export function resetContentCache() {
  dsaIndexCache = cpIndexCache = companyIndexCache = patternIndexCache = null;
  dsaSlugSet = companyIdSet = patternSlugSet = noteSlugCache = null;
}

// BUG-141: a route param must already be a canonical slug. Anything else
// (uppercase, dots, slashes, spaces) is invalid and yields null, never a
// "cleaned" slug that could match a different real page.
// BUG-125: it must also exist in the canonical index, so an orphan file
// left on disk can never be served.
function readContentJson(dir, slug, indexSet) {
  if (!isValidSlug(slug)) return null;
  if (!indexSet.has(slug)) return null;
  const file = path.join(contentDir(), dir, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

export function getDsaIndex() {
  if (dsaIndexCache) return dsaIndexCache;
  const file = path.join(contentDir(), 'problems', 'index.json');
  dsaIndexCache = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return dsaIndexCache;
}

export function getCpIndex() {
  if (cpIndexCache) return cpIndexCache;
  const file = path.join(contentDir(), 'cp', 'index.json');
  cpIndexCache = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return cpIndexCache;
}

/* Full 4-language/2-variant solutions object for one problem, lazily served via app/api/solutions/[slug]/route.js - kept out of the main problem bundle (see build-content.mjs's `defaultSolution` doc comment) so it's never eagerly embedded in the problem page's hydration payload. */
export function getSolutions(slug) {
  return readContentJson('solutions', slug, getDsaSlugSet());
}

/** One full problem bundle, by slug. Returns null if it doesn't exist. */
export function getProblemBundle(slug) {
  return readContentJson('problems', slug, getDsaSlugSet());
}

function getDsaSlugSet() {
  if (!dsaSlugSet) dsaSlugSet = new Set(getDsaIndex().map((p) => p.slug));
  return dsaSlugSet;
}

/** All slugs with a real bundle - used by generateStaticParams. */
export function getAllProblemSlugs() {
  return getDsaIndex().map((p) => p.slug);
}

export function getCompanyIndex() {
  if (companyIndexCache) return companyIndexCache;
  const file = path.join(contentDir(), 'companies', 'index.json');
  companyIndexCache = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return companyIndexCache;
}

export function getCompanyDetail(id) {
  if (!companyIdSet) companyIdSet = new Set(getCompanyIndex().map((c) => c.id));
  return readContentJson('companies', id, companyIdSet);
}

export function getPatternIndex() {
  if (patternIndexCache) return patternIndexCache;
  const file = path.join(contentDir(), 'patterns', 'index.json');
  patternIndexCache = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return patternIndexCache;
}

export function getPatternDetail(slug) {
  if (!patternSlugSet) patternSlugSet = new Set(getPatternIndex().map((p) => p.slug));
  return readContentJson('patterns', slug, patternSlugSet);
}

/* Roadmap context for a problem detail page (point 5 of the problems-page data audit): is_atlas_roadmap/
   roadmap_level/roadmap_topic/roadmap_order are fully populated in the index but nothing ever reads them
   on the detail page - no "step N of M" indicator, no prev/next. This reads the already-cached DSA index
   (no extra fs read) and returns this problem's siblings within the same level+topic, sorted by
   roadmap_order, plus its position and prev/next neighbors. Returns null for the ~98% of problems that
   aren't roadmap-curated - the section just doesn't render for those. Level names come from ROADMAP_LEVELS
   (constants/roadmap.js), the single source of truth for the roadmap. */
export function getRoadmapContext(problem) {
  if (!problem?.is_atlas_roadmap) return null;

  const siblings = getDsaIndex()
    .filter((p) => p.is_atlas_roadmap && p.roadmap_level === problem.roadmap_level && p.roadmap_topic === problem.roadmap_topic)
    .sort((a, b) => (a.roadmap_order ?? 0) - (b.roadmap_order ?? 0));

  const index = siblings.findIndex((p) => p.canonical_id === problem.canonical_id);
  if (index === -1) return null;

  return {
    // BUG-02: the roadmap's own level titles. LEVEL_NAMES is the older 10-entry NOTES naming and disagreed for 9 of 12 levels.
    levelName: ROADMAP_LEVELS.find((l) => l.level === problem.roadmap_level)?.title || `Level ${problem.roadmap_level}`,
    level: problem.roadmap_level,
    topic: problem.roadmap_topic,
    position: index + 1,
    total: siblings.length,
    prev: index > 0 ? siblings[index - 1] : null,
    next: index < siblings.length - 1 ? siblings[index + 1] : null,
  };
}

/** Notes: same shape as before (constants/notes.js + content/notes/<slug>.json). BUG-127, 128: the canonical list is NOTES_TOPICS_INDEX; files on disk only confirm it. An indexed note with no file throws (build failure), a stray file that is not indexed is ignored. */
export function getAvailableNoteSlugs() {
  if (noteSlugCache) return noteSlugCache;
  const dir = path.join(contentDir(), 'notes');
  const onDisk = fs.existsSync(dir)
    ? new Set(fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')))
    : new Set();
  const indexed = NOTES_TOPICS_INDEX.map((t) => t.slug);
  const missing = indexed.filter((slug) => !onDisk.has(slug));
  if (missing.length > 0) {
    throw new Error(`content/notes is missing ${missing.length} indexed note file(s): ${missing.join(', ')}`);
  }
  noteSlugCache = new Set(indexed);
  return noteSlugCache;
}

export function getNoteContent(slug) {
  if (!isValidSlug(slug) || !getAvailableNoteSlugs().has(slug)) return null;
  const file = path.join(contentDir(), 'notes', `${slug}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

const LEVEL_NAMES = {
  0: 'Foundations', 1: 'Arrays & Preprocessing', 2: 'Search & Hashing',
  3: 'Linear Structures', 4: 'Core Techniques', 5: 'Trees & Heaps',
  6: 'Graphs I', 7: 'Dynamic Programming', 8: 'Advanced Structures',
  9: 'Math & CP Extras',
};

/* BUG FIX / dynamic-count: `ready`/`total` are computed from NOTES_TOPICS_INDEX (canonical) confirmed against the files under content/notes/ - add a topic to the constant and its raw-data/notes file, and these numbers (and the whole /notes page) update on the next build with no code change anywhere. Never hand-typed. */
// BUG-186: a notes level with no name is a build error, never a silent "Other".
function noteLevelName(level) {
  const name = LEVEL_NAMES[level];
  if (!name) throw new Error(`NOTES_TOPICS_INDEX uses level ${level} but LEVEL_NAMES has no name for it`);
  return name;
}

export function getNotesIndex() {
  const available = getAvailableNoteSlugs();
  const topics = NOTES_TOPICS_INDEX.map((t) => ({
    ...t,
    levelName: noteLevelName(t.level),
    available: available.has(t.slug),
  }));

  const byLevel = {};
  for (const t of topics) {
    if (!byLevel[t.level]) byLevel[t.level] = { level: t.level, name: noteLevelName(t.level), topics: [] };
    byLevel[t.level].topics.push(t);
  }

  return {
    // BUG-147: the starred (last) level, derived once from the index.
    starLevel: getStarLevel(NOTES_TOPICS_INDEX),
    levels: Object.values(byLevel).sort((a, b) => a.level - b.level),
    total: topics.length,
    ready: topics.filter((t) => t.available).length,
  };
}


/* Sidebar topics (DSA_TOPICS) that have no company-pipeline pattern page get a page built from the DSA index, so every
   topic a user can filter by in the sidebar also has a working /patterns/<slug> page. Returns a pattern-page-shaped entry or null. */
const TOPIC_PRACTICE_LIMIT = 30;
export function getTopicPatternEntry(slug) {
  if (!isValidSlug(slug)) return null;
  const name = DSA_TOPICS.find((t) => patternSlug(t) === slug);
  if (!name) return null;
  const rows = getDsaIndex().filter((p) => p.should_generate !== false && p.topics_display?.includes(name));
  if (rows.length === 0) return null;
  const practiceProblems = [...rows]
    .sort((a, b) => (b.frequency_score || 0) - (a.frequency_score || 0) || (a.difficulty || 0) - (b.difficulty || 0))
    .slice(0, TOPIC_PRACTICE_LIMIT)
    .map((p) => ({
      title: p.title,
      leetcodeSlug: p.slug,
      atlasProblemId: p.canonical_id,
      atlasSlug: p.slug,
      difficulty: p.difficulty_label || '',
      askedAt: [],
      askedAtCount: 0,
    }));
  return { pattern: name, slug, totalProblemsInPool: rows.length, companiesSeenIn: 0, practiceProblems };
}

/** Slugs of sidebar topics that need the fallback page above. */
export function getTopicOnlyPatternSlugs() {
  const have = new Set(getPatternIndex().map((p) => p.slug));
  return DSA_TOPICS.map((t) => patternSlug(t)).filter((s) => !have.has(s) && getTopicPatternEntry(s));
}

/** Index rows for EVERY /patterns/<slug> page: the company-pipeline patterns plus the topic-only ones. */
export function getAllPatternIndexRows() {
  const topicOnly = getTopicOnlyPatternSlugs().map((slug) => {
    const entry = getTopicPatternEntry(slug);
    return {
      pattern: entry.pattern,
      slug,
      totalProblemsInPool: entry.totalProblemsInPool,
      companiesSeenIn: 0,
      practiceCount: entry.practiceProblems.length,
      titles: entry.practiceProblems.map((r) => r.title),
    };
  });
  return [...getPatternIndex(), ...topicOnly];
}

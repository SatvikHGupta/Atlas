// Server-only content access - fs reads against the content/ directory produced
import fs from 'node:fs';
import path from 'node:path';
import { ROADMAP_LEVELS } from '../../constants/roadmap.js';
import { NOTES_TOPICS_INDEX } from '../../constants/notes.js';
import { DSA_TOPICS } from '../../constants/tags.generated.js';
import { patternSlug } from '../patternSlug.js';
import { isValidSlug } from '../slugValidation.js';
import { getStarLevel } from '../noteLevels.js';

// ATLAS_CONTENT_DIR lets tests and scripts point at a fixture folder
const contentDir = () => process.env.ATLAS_CONTENT_DIR || path.join(process.cwd(), 'content');

let dsaIndexCache = null;
let cpIndexCache = null;
let companyIndexCache = null;
let patternIndexCache = null;
let dsaSlugSet = null;
let companyIdSet = null;
let patternSlugSet = null;
let noteSlugCache = null;

// Test helper: forget every cached index so a new fixture folder is read
export function resetContentCache() {
  dsaIndexCache = cpIndexCache = companyIndexCache = patternIndexCache = null;
  dsaSlugSet = companyIdSet = patternSlugSet = noteSlugCache = null;
}

// a route param must already be a canonical slug
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

// Full 4-language/2-variant solutions object for one problem
export function getSolutions(slug) {
  return readContentJson('solutions', slug, getDsaSlugSet());
}

// One full problem bundle, by slug
export function getProblemBundle(slug) {
  return readContentJson('problems', slug, getDsaSlugSet());
}

function getDsaSlugSet() {
  if (!dsaSlugSet) dsaSlugSet = new Set(getDsaIndex().map((p) => p.slug));
  return dsaSlugSet;
}

// All slugs with a real bundle - used by generateStaticParams
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

// Roadmap context for a problem detail page
export function getRoadmapContext(problem) {
  if (!problem?.is_atlas_roadmap) return null;

  const siblings = getDsaIndex()
    .filter((p) => p.is_atlas_roadmap && p.roadmap_level === problem.roadmap_level && p.roadmap_topic === problem.roadmap_topic)
    .sort((a, b) => (a.roadmap_order ?? 0) - (b.roadmap_order ?? 0));

  const index = siblings.findIndex((p) => p.canonical_id === problem.canonical_id);
  if (index === -1) return null;

  return {
    levelName: ROADMAP_LEVELS.find((l) => l.level === problem.roadmap_level)?.title || `Level ${problem.roadmap_level}`,
    level: problem.roadmap_level,
    topic: problem.roadmap_topic,
    position: index + 1,
    total: siblings.length,
    prev: index > 0 ? siblings[index - 1] : null,
    next: index < siblings.length - 1 ? siblings[index + 1] : null,
  };
}

// Notes: same shape as before (constants/notes.js + content/notes/<slug>.json)
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

// / dynamic-count: `ready`/`total` are computed from NOTES_TOPICS_INDEX
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
    starLevel: getStarLevel(NOTES_TOPICS_INDEX),
    levels: Object.values(byLevel).sort((a, b) => a.level - b.level),
    total: topics.length,
    ready: topics.filter((t) => t.available).length,
  };
}

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

// Slugs of sidebar topics that need the fallback page above
export function getTopicOnlyPatternSlugs() {
  const have = new Set(getPatternIndex().map((p) => p.slug));
  return DSA_TOPICS.map((t) => patternSlug(t)).filter((s) => !have.has(s) && getTopicPatternEntry(s));
}

// Index rows for EVERY /patterns/<slug> page
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

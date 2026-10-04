#!/usr/bin/env node
/* build-companies.mjs  -  STAGE 1 of the companies pipeline (generates the company + pattern JSON the site serves).
 *
 * Inputs
 *   raw-data/company-sources/registry.json     the companies to show (id, name, folders, tier, region)
 *   raw-data/company-sources/pools.json        stage 0 output: full LeetCode-tagged pool per company + repo-wide breadth
 *   raw-data/company-sources/curated/<id>.json hand-written data: roles, roleGuidance, extra dated problems (code360/gfg)
 *   raw-data/oc-split/02-code-bearing-index.json   Atlas' DSA problems (lc_slug -> canonical_id, atlas slug, title)
 *   raw-data/tags/tags.ndjson + tag-taxonomy.json  tags per problem (overlay keyed by canonical_id)
 * Outputs (regenerated in full every run; the two folders below are wiped first)
 *   raw-data/company-problems/companies/<id>.json, raw-data/company-problems/index.json
 *   raw-data/company-problems/patterns/<slug>.json, raw-data/company-problems/patterns/index.json
 *   raw-data/company-problems/asked-at.json   { atlasProblemId: [[companyId, frequency], ...] } from the WHOLE pools (most frequent first)
 *   raw-data/company-problems/build-report.json
 *
 * Rules (agreed with the owner)
 *   - The company's WHOLE pool (every all.csv row that links to an Atlas problem) drives profiles and pattern pages.
 *   - The page lists the TOP 30 problems by frequency. Ties are broken deterministically, in this order:
 *       1. all-time frequency (desc)   2. recency window (30d < 3m < 6m < older)   3. frequency inside that window (desc)
 *       4. breadth = number of repo companies that list the problem (desc)          5. LeetCode id (asc)
 *   - Duplicates are folded (alias folders are merged in stage 0; a problem appears once per company).
 *   - Curated extras (dated Code360/GFG reports) are kept, de-duplicated against the top 30 by atlasProblemId.
 *   - Only tags whose taxonomy kind is `lc-topic` are used (Atlas-only labels stay out until the owner decides them).
 *
 * Usage: node scripts/build-companies.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { RETIRED_IDS } from '../src/constants/retiredProblems.js';

const TOP_N = 30;
const PROFILE_KEEP = 12;                 // entries stored in patternProfile (UI shows the top 6)
const DISTINCTIVE_MIN_COUNT = 3;         // a "distinctive" pattern needs >= 3 problems ...
const DISTINCTIVE_MIN_SHARE = 3;         // ... and >= 3 % weighted share, so one-off problems can't produce a "signature"
const PRACTICE_N = 30;
// (removed ASKED_AT_MAX cap - pattern pages now store every company that asked a problem, not just
// the top 8. askedAtCount always equals askedAt.length by construction now. The UI (CompanyChipRow.jsx)
// is what truncates to a "top 4 + N more" display, not the data - so this list can be as long as it
// needs to be without touching any component.)
const SNAPSHOT_MONTH = '2026-07';        // the CSV snapshot is "as of 12 July 2026"

const R = 'raw-data';
const OUT = `${R}/company-problems`;
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const patternSlug = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');   // same as src/lib/patternSlug.js
const round1 = (n) => Math.round(n * 10) / 10;
const die = (m) => { console.error('ERROR: ' + m); process.exit(1); };

// ---- inputs -----------------------------------------------------------------------------------------
for (const f of [`${R}/company-sources/registry.json`, `${R}/company-sources/pools.json`, `${R}/oc-split/02-code-bearing-index.json`, `${R}/tags/tags.ndjson`, `${R}/tags/tag-taxonomy.json`])
  if (!fs.existsSync(f)) die(`missing ${f}`);
const registry = readJson(`${R}/company-sources/registry.json`);
const pools = readJson(`${R}/company-sources/pools.json`);
const taxonomy = readJson(`${R}/tags/tag-taxonomy.json`);
const lcKind = new Set(taxonomy.tags.filter((t) => t.kind === 'lc-topic').map((t) => t.name));

// Atlas problems: lc_slug -> record, and canonical_id -> record (same data, second key needed for
// filling small pattern pools below - a problem can carry a tag without ever appearing in any
// company's pool, so the by-id lookup is how those get found).
const atlasBySlug = new Map();
const atlasById = new Map();
const rl = readline.createInterface({ input: fs.createReadStream(`${R}/oc-split/02-code-bearing-index.json`, 'utf8'), crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.trim()) continue;
  const r = JSON.parse(line);
  if (RETIRED_IDS.has(r.canonical_id)) continue; // removed problems are not linkable from company pages
  const lc = (r.source_platforms || []).find((p) => p.platform === 'leetcode');
  const m = lc && /\/problems\/([^/?#]+)/.exec(lc.url || '');
  if (m) {
    const rec = { id: r.canonical_id, atlasSlug: r.slug, title: r.title, leetcodeSlug: m[1], leetcodeId: lc.platform_id != null ? Number(lc.platform_id) : null, difficulty: r.difficulty_label };
    atlasBySlug.set(m[1], rec);
    atlasById.set(r.canonical_id, rec);
  }
}

// Tags per canonical_id (lc-topic kind only), and Atlas-wide usage per tag
const tagsById = new Map();
const atlasWide = new Map();
const idsByTag = new Map();     // tag -> Set(canonical_id) - every problem carrying the tag, company pool or not
for (const line of fs.readFileSync(`${R}/tags/tags.ndjson`, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const t = JSON.parse(line);
  if (RETIRED_IDS.has(t.canonical_id)) continue; // removed problems never feed pattern pools (src/constants/retiredProblems.js)
  const tags = (t.tags || []).filter((x) => lcKind.has(x));
  tagsById.set(t.canonical_id, tags);
  for (const x of tags) {
    atlasWide.set(x, (atlasWide.get(x) || 0) + 1);
    const s = idsByTag.get(x) || new Set(); s.add(t.canonical_id); idsByTag.set(x, s);
  }
}

const snap = pools.meta;
const csvUrl = (folder) => `${snap.source}/blob/${snap.dataCommit}/${folder}/all.csv`;   // PINNED to the data commit
const curatedFile = (id) => `${R}/company-sources/curated/${id}.json`;

// ---- pass 1: per-company pools ----------------------------------------------------------------------
const TIER_KEYS = ['30d', '3m', '6m', 'older'];
const companies = [];
const report = { snapshot: snap, topN: TOP_N, warnings: [], boundaryTies: [], perCompany: {}, totals: {} };

for (const reg of registry.companies) {
  const pool = pools.companies[reg.id];
  if (!pool) { report.warnings.push(`no pool for ${reg.id}`); continue; }
  const cur = fs.existsSync(curatedFile(reg.id)) ? readJson(curatedFile(reg.id)) : null;

  // link to Atlas + attach tags + rank key
  const linked = [];
  let unlinked = 0;
  for (const row of pool.rows) {
    const a = atlasBySlug.get(row.slug);
    if (!a) { unlinked++; continue; }
    linked.push({ ...row, atlas: a, tags: tagsById.get(a.id) || [], breadth: pools.breadth[row.slug] || 1 });
  }
  const keyOf = (r) => [-r.freq, r.tier, -r.wfreq, -r.breadth];
  const cmpKey = (a, b) => { const ka = keyOf(a), kb = keyOf(b); for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i]; return 0; };
  linked.sort((a, b) => cmpKey(a, b) || (a.atlas.leetcodeId ?? 1e9) - (b.atlas.leetcodeId ?? 1e9) || a.slug.localeCompare(b.slug));
  linked.forEach((r, i) => { r.rank = i + 1; });

  // is the cut-off (rank N | N+1) still tied after keys 1-4? (5 = deterministic id order)
  if (linked.length > TOP_N && cmpKey(linked[TOP_N - 1], linked[TOP_N]) === 0) {
    const k = keyOf(linked[TOP_N - 1]).join('|');
    report.boundaryTies.push({ id: reg.id, tiedProblems: linked.filter((r) => keyOf(r).join('|') === k).length });
  }

  const tier = reg.tier ?? (linked.length >= 100 ? 1 : 2);
  const tagged = linked.filter((r) => r.tags.length);
  const totalW = tagged.reduce((s, r) => s + r.freq / 100, 0) || tagged.length || 1;
  const stat = new Map();               // tag -> { count, w }
  for (const r of tagged) for (const t of r.tags) {
    const s = stat.get(t) || { count: 0, w: 0 };
    s.count++; s.w += (r.freq || 1) / 100; stat.set(t, s);
  }
  companies.push({ reg, cur, tier, pool, linked, unlinked, tagged, totalW, stat });
  report.perCompany[reg.id] = { csvRows: pool.csvRows, linkable: linked.length, unlinked, tagged: tagged.length, tier };
}

// ---- baseline for "lift" (macro average of weighted shares across all companies) ---------------------------
const allTags = new Set(); companies.forEach((c) => c.stat.forEach((_, t) => allTags.add(t)));
const baseline = new Map();
for (const t of allTags) {
  let sum = 0;
  for (const c of companies) sum += c.stat.has(t) ? (100 * c.stat.get(t).w) / c.totalW : 0;
  baseline.set(t, sum / companies.length);
}

// pattern pages exist for every lc-topic tag that appears in some company pool
const patternAsked = new Map();         // tag -> Map(atlasId -> { rec, askedAt:[{company,freq}] })
for (const c of companies) for (const r of c.tagged) for (const t of r.tags) {
  const m = patternAsked.get(t) || new Map(); patternAsked.set(t, m);
  const e = m.get(r.atlas.id) || { r, askedAt: [] }; m.set(r.atlas.id, e);
  e.askedAt.push({ company: c.reg.id, freq: r.freq });
}

// ---- outputs ---------------------------------------------------------------------------------------
for (const d of [`${OUT}/companies`, `${OUT}/patterns`]) { fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); }
const index = [];

for (const c of companies) {
  const { reg, cur, pool, linked, tagged, tier } = c;
  const url = csvUrl(reg.folders[0]);
  const shape = (r) => ({
    title: r.atlas.title,
    atlasProblemId: r.atlas.id,
    leetcodeId: r.atlas.leetcodeId,
    leetcodeSlug: r.slug,
    difficulty: r.atlas.difficulty,
    frequency: r.freq,
    patterns: r.tags,
    role: null,
    confidenceTier: 'A',
    source: 'leetcode-company-tag-mirror',
    sourceUrl: url,
    lastSeen: SNAPSHOT_MONTH,
    atlasSlug: r.atlas.atlasSlug,
    rank: r.rank,
    recency: TIER_KEYS[r.tier],
  });
  const top = linked.slice(0, TOP_N).map(shape);
  const byId = new Map(top.map((p) => [p.atlasProblemId, p]));

  // curated extras (dated Code360/GFG reports): keep, refresh tags, merge with the top list on atlasProblemId
  for (const ex of cur?.extraProblems || []) {
    const tags = tagsById.get(ex.atlasProblemId);
    const refreshed = { ...ex, patterns: tags && tags.length ? tags : ex.patterns };
    delete refreshed.topicSourceUrl;
    const dup = byId.get(ex.atlasProblemId);
    if (dup) Object.assign(dup, { ...refreshed, frequency: dup.frequency, rank: dup.rank, recency: dup.recency, alsoInMirror: true });   // curated fields win, mirror stats kept
    else { top.push({ ...refreshed, rank: null, recency: null }); byId.set(ex.atlasProblemId, top[top.length - 1]); }
  }

  // profile from the WHOLE pool
  const profileAll = [...c.stat.entries()].map(([pattern, s]) => {
    const share = (100 * s.w) / c.totalW;
    return { pattern, count: s.count, share: round1(share), lift: round1(share / (baseline.get(pattern) || share || 1)), hasPracticeSet: patternAsked.has(pattern) };
  }).sort((a, b) => b.share - a.share || b.count - a.count || a.pattern.localeCompare(b.pattern));
  const patternProfile = profileAll.slice(0, PROFILE_KEEP);
  const distinctive = profileAll.filter((p) => p.count >= DISTINCTIVE_MIN_COUNT && p.share >= DISTINCTIVE_MIN_SHARE).sort((a, b) => b.lift - a.lift || b.share - a.share).slice(0, 5).map((p) => p.pattern);

  // focusPatterns: hand-written names win; `null`/missing = derive from THIS company's pool (top shares + distinctive), so
  // guidance is company-specific and refreshes whenever tags change.
  const autoFocus = [...new Set([...profileAll.filter((p) => p.hasPracticeSet).slice(0, 4).map((p) => p.pattern), ...distinctive])].slice(0, 6);
  const roleGuidance = {};
  for (const [role, g] of Object.entries(cur?.roleGuidance || {})) {
    roleGuidance[role] = { ...g, focusPatterns: Array.isArray(g.focusPatterns) && g.focusPatterns.length ? g.focusPatterns : autoFocus, rounds: g.rounds || [], extraTopics: g.extraTopics || [] };
  }

  const rec = (max) => linked.filter((r) => r.tier <= max).length;
  const company = {
    id: reg.id,
    name: reg.name,
    tier,
    region: reg.region,
    domain: reg.domain,
    website: reg.domain ? `https://${reg.domain}` : null,
    linkedin: reg.linkedin || null,
    careersUrl: reg.careersUrl || null,
    linkResearch: reg.linkResearch || null,   // 'confirmed' (verified via search) | 'recall' (stable public fact, not individually re-checked) - see raw-data/company-sources/registry.json
    // local 128px logo if scripts/one-time/build-logos.mjs produced one (checked here, at build time, so the client never
    // requests a file that doesn't exist); null -> CompanyBadge goes straight to the remote fallback chain
    logo: fs.existsSync(path.join('public', 'logos', `${reg.id}.png`)) ? `/logos/${reg.id}.png` : null,
    roles: cur?.roles || [],
    rolesStatus: cur?.rolesStatus || 'pending',
    roleFamilies: cur?.roleFamilies || [],
    ladder: cur?.ladder || [],
    roleGuidance,
    rolesAsOf: cur?.rolesAsOf || null,
    rolesConfidence: cur?.rolesConfidence || null,
    rolesNotes: cur?.rolesNotes || null,
    indiaNote: cur?.indiaNote || null,
    rolesSources: cur?.sources || [],
    totalTaggedByLeetCode: pool.rows.length,
    pool: { linkable: linked.length, unlinked: c.unlinked, tagged: tagged.length, coverage: round1((100 * linked.length) / (pool.rows.length || 1)) },
    recency: { last30Days: rec(0), last3Months: rec(1), last6Months: rec(2), olderOnly: linked.filter((r) => r.tier === 3).length },
    dataSnapshot: { repo: snap.source, commit: snap.dataCommit, label: snap.snapshotLabel, month: SNAPSHOT_MONTH },
    sourceCsv: url,
    sourceCsvExtra: reg.folders.slice(1).map(csvUrl),
    patternProfile,
    patternProfileMeta: { basis: 'full-pool', weighting: 'frequency', taggedProblems: tagged.length, poolProblems: linked.length, baseline: 'macro-average of all companies', distinctive },
    problems: top,
  };
  fs.writeFileSync(`${OUT}/companies/${reg.id}.json`, JSON.stringify(company, null, 2));

  index.push({
    id: reg.id, name: reg.name, tier, region: reg.region, domain: reg.domain, logo: company.logo, roles: company.roles, rolesStatus: company.rolesStatus, rolesConfidence: company.rolesConfidence,
    problemCount: top.length, totalTaggedByLeetCode: company.totalTaggedByLeetCode, poolLinkable: linked.length, coverage: company.pool.coverage,
    lastUpdated: SNAPSHOT_MONTH, sources: [...new Set(top.map((p) => p.source))].sort(),
    problemsWithPatterns: top.filter((p) => p.patterns.length).length,
    topPatterns: profileAll.slice(0, 3).map((p) => p.pattern),
    distinctivePatterns: distinctive.slice(0, 3),
    recent: { last30Days: company.recency.last30Days, last6Months: company.recency.last6Months },
    linkedToAtlas: top.filter((p) => p.atlasProblemId).length,
  });
}
index.sort((a, b) => a.tier - b.tier || b.poolLinkable - a.poolLinkable || a.name.localeCompare(b.name));
fs.writeFileSync(`${OUT}/index.json`, JSON.stringify(index, null, 2));

// ---- asked-at index (problem -> companies whose WHOLE pool contains it) -------------------------------
// The company files only carry the top 30, so problem pages must not derive "Asked at" from them.
const askedAt = {};
for (const c of companies) for (const r of c.linked) (askedAt[r.atlas.id] ||= []).push([c.reg.id, r.freq]);
for (const id of Object.keys(askedAt)) askedAt[id].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));   // most frequent first
fs.writeFileSync(`${OUT}/asked-at.json`, JSON.stringify(askedAt));

// ---- pattern pages ---------------------------------------------------------------------------------
const patternIndex = [];
const slugSeen = new Map();
for (const [name, m] of patternAsked) {
  const slug = patternSlug(name);
  if (slugSeen.has(slug)) die(`pattern slug collision: "${name}" and "${slugSeen.get(slug)}" -> ${slug}`);
  slugSeen.set(slug, name);
  const list = [...m.values()].map((e) => ({
    e, count: e.askedAt.length, breadth: e.r.breadth,
  })).sort((a, b) => b.count - a.count || b.breadth - a.breadth || (a.e.r.atlas.leetcodeId ?? 1e9) - (b.e.r.atlas.leetcodeId ?? 1e9));

  // Fill up to min(pool, PRACTICE_N): a problem can carry this tag without ever appearing in any
  // company's pool (e.g. "Manacher" has a 3-problem pool but only 2 were ever asked at a company) -
  // without this, small pools showed fewer practice problems than actually exist for the pattern.
  // Backfilled entries get askedAtCount 0 / no companies, sorted after every company-linked one.
  const target = Math.min(atlasWide.get(name) || 0, PRACTICE_N);
  if (list.length < target) {
    const already = new Set(list.map((x) => x.e.r.atlas.id));
    const fillIds = [...(idsByTag.get(name) || [])].filter((id) => !already.has(id) && atlasById.has(id))
      .sort((a, b) => (atlasById.get(a).leetcodeId ?? 1e9) - (atlasById.get(b).leetcodeId ?? 1e9));
    for (const id of fillIds) {
      if (list.length >= target) break;
      const atlas = atlasById.get(id);
      list.push({ e: { r: { atlas, slug: atlas.leetcodeSlug, breadth: 0 }, askedAt: [] }, count: 0, breadth: 0 });
    }
  }

  const practiceProblems = list.slice(0, PRACTICE_N).map(({ e, count }) => ({
    title: e.r.atlas.title, atlasProblemId: e.r.atlas.id, leetcodeSlug: e.r.slug, difficulty: e.r.atlas.difficulty,
    askedAtCount: count,
    askedAt: [...e.askedAt].sort((a, b) => b.freq - a.freq || a.company.localeCompare(b.company)).map((x) => x.company),
    atlasSlug: e.r.atlas.atlasSlug,
  }));
  const companiesSeenIn = new Set([...m.values()].flatMap((e) => e.askedAt.map((x) => x.company))).size;
  const page = { pattern: name, totalProblemsInPool: atlasWide.get(name) || 0, companiesSeenIn, practiceProblems };
  fs.writeFileSync(`${OUT}/patterns/${slug}.json`, JSON.stringify(page, null, 2));
  patternIndex.push({ pattern: name, slug, totalProblemsInPool: page.totalProblemsInPool, companiesSeenIn, practiceCount: practiceProblems.length, titles: practiceProblems.map((p) => p.title) });
}
patternIndex.sort((a, b) => b.companiesSeenIn - a.companiesSeenIn || b.totalProblemsInPool - a.totalProblemsInPool || a.pattern.localeCompare(b.pattern));
fs.writeFileSync(`${OUT}/patterns/index.json`, JSON.stringify(patternIndex, null, 2));

// ---- report ----------------------------------------------------------------------------------------
report.totals = {
  companies: companies.length,
  tiers: [1, 2, 3].map((t) => companies.filter((c) => c.tier === t).length),
  india: companies.filter((c) => c.reg.region === 'India').length,
  problemLinks: index.reduce((s, c) => s + c.problemCount, 0),
  distinctProblemsShown: new Set(companies.flatMap((c) => fs.existsSync(`${OUT}/companies/${c.reg.id}.json`) ? readJson(`${OUT}/companies/${c.reg.id}.json`).problems.map((p) => p.atlasProblemId) : [])).size,
  patternPages: patternIndex.length,
  companiesWithBoundaryTie: report.boundaryTies.length,
};
report.warnings.push(...companies.filter((c) => c.linked.length < 15).map((c) => `${c.reg.id}: only ${c.linked.length} linkable problems`));
fs.writeFileSync(`${OUT}/build-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.totals, null, 1));
if (report.warnings.length) console.log('warnings:', report.warnings);

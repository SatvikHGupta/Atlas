import { getDsaIndex, getCompanyIndex, getAllPatternIndexRows, getAvailableNoteSlugs } from '../lib/server/content.server.js';
import { ROADMAP_LEVELS } from '../constants/roadmap.js';
import { SITE_URL } from '../lib/siteUrl.js';
import { routes, absoluteUrl, isCanonicalTwin } from '../lib/routeIdentity.js';

// Single sitemap.xml - the URL count (problems + patterns + companies + notes + roadmap + statics) stays far below Google's 50,000 URLs-per-file / 50MB limit, so there's no need for Next's multi-file generateSitemaps() split. Revisit only if the dataset grows an order of magnitude. Every URL comes from a canonical index (BUG-166), never from files found on disk.
// BUG-164: no lastModified anywhere. A build-time "now" would tell crawlers every page changed on every deploy; omitting it is honest until real per-page timestamps exist.
export default function sitemap() {
  const staticPaths = [routes.home(), routes.problems(), routes.cp(), routes.companies(), routes.patterns(), routes.notes(), routes.roadmap(), routes.privacy(), routes.terms()];
  const statics = staticPaths.map((path) => ({
    url: absoluteUrl(SITE_URL, path),
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.8,
  }));

  // ATLAS-BUG-010: only CANONICAL urls are advertised. A twin (duplicate import of the same problem) has a canonical tag
  // pointing at its original, so listing it as its own URL sends crawlers mixed signals.
  const problems = getDsaIndex().filter((p) => !isCanonicalTwin(p.slug)).map((p) => ({
    url: absoluteUrl(SITE_URL, routes.problem(p.slug)),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const companies = getCompanyIndex().map((c) => ({
    url: absoluteUrl(SITE_URL, routes.company(c.id)),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const patterns = getAllPatternIndexRows().map((p) => ({
    url: absoluteUrl(SITE_URL, routes.pattern(p.slug)),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  // BUG-128: derived from NOTES_TOPICS_INDEX (confirmed on disk), not a directory scan.
  const notes = Array.from(getAvailableNoteSlugs()).map((slug) => ({
    url: absoluteUrl(SITE_URL, routes.note(slug)),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const roadmapLevels = ROADMAP_LEVELS.map((l) => ({
    url: absoluteUrl(SITE_URL, routes.roadmapLevel(l.level)),
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  // CP problems are deliberately NOT included - no per-problem page exists for them (thin-content decision from Phase 0/1), so there's nothing to list beyond the /cp index page already in `statics`.
  return [...statics, ...problems, ...companies, ...patterns, ...notes, ...roadmapLevels];
}

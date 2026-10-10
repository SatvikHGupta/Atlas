import { getDsaIndex, getCompanyIndex, getAllPatternIndexRows, getAvailableNoteSlugs } from '../lib/server/content.server.js';
import { ROADMAP_LEVELS } from '../constants/roadmap.js';
import { SITE_URL } from '../lib/siteUrl.js';
import { routes, absoluteUrl, isCanonicalTwin } from '../lib/routeIdentity.js';

// Single sitemap.xml - the URL count
export default function sitemap() {
  const staticPaths = [routes.home(), routes.problems(), routes.cp(), routes.companies(), routes.patterns(), routes.notes(), routes.roadmap(), routes.privacy(), routes.terms(), routes.about(), routes.contact()];
  const statics = staticPaths.map((path) => ({
    url: absoluteUrl(SITE_URL, path),
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.8,
  }));

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

  return [...statics, ...problems, ...companies, ...patterns, ...notes, ...roadmapLevels];
}

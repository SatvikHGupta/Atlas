import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllProblemSlugs, getProblemBundle, getRoadmapContext, getPatternIndex } from '../../../lib/server/content.server.js';
import { resolvePatternSlug } from '../../../constants/patternAliases.js';
import { breadcrumbSchema, learningResourceSchema } from '../../../lib/jsonld.js';
import JsonLd from '../../../components/JsonLd.jsx';
import PageWrapper from '../../../components/layout/PageWrapper/PageWrapper.jsx';
import DifficultyBadge from '../../../components/problem/DifficultyBadge/DifficultyBadge.jsx';
import { routes, canonicalAlternates } from '../../../lib/routeIdentity.js';
import ExplanationTabs from '../../../components/problem/ExplanationTabs/ExplanationTabs.jsx';
import SolutionViewer from '../../../components/problem/SolutionViewer/SolutionViewer.jsx';
import ProblemExamples from '../../../components/problem/ProblemExamples/ProblemExamples.jsx';
import OriginalStatement from '../../../components/problem/OriginalStatement/OriginalStatement.jsx';
import RoadmapContext from '../../../components/problem/RoadmapContext/RoadmapContext.jsx';
import CompanyChipRow from '../../../components/company/CompanyChipRow.jsx';
import { BackButton, BookmarkButton, ProgressButtons } from './ProblemActions.jsx';
import { pickSolvePlatform } from '../../../lib/platforms.utils.js';
import styles from './ProblemDetail.module.css';

// BUG-125: only slugs returned by generateStaticParams exist, anything else is a 404.
export const dynamicParams = false;

// One static page per DSA problem, generated from the actual dataset - add a problem to content/problems/index.json and it gets a page on the next build, no route code changes needed. See lib/server/content.server.js.
export function generateStaticParams() {
  return getAllProblemSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  params = await params;
  const problem = getProblemBundle(params.slug);
  if (!problem) return { title: 'Problem not found - Atlas' };

  const topics = (problem.topics || []).slice(0, 3).join(', ');
  return {
    // BUG-10: duplicate imports point search engines at one original page
    alternates: canonicalAlternates(routes.problem(params.slug)),
    title: `${problem.title} - Atlas`,
    description: problem.explanation_short
      ? problem.explanation_short.slice(0, 155)
      : `${problem.title}${topics ? ` - ${topics}` : ''}. Worked explanation and solutions in JavaScript, C++, Java, and Python.`,
  };
}

// BUG FIX / dep cleanup: RedirectButton was imported in the old ProblemDetail.jsx and never rendered - dropped rather than ported. The flat-key -> nested-solutions reshape that used to happen here on every render now happens once, at data-build time (see scripts/build-content.mjs) - `problem.solutions` arrives already shaped.
// BUG-145, 146: never fall back to a generic LeetCode search. No real external URL means no button, just a short note.
function SolveButton({ platforms }) {
  const primary = pickSolvePlatform(platforms); // LeetCode first, else the first platform that has a URL
  const url = primary?.url;
  if (!url) return <span className={styles.noSource}>No external link for this problem</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={styles.solveBtn}>
      Solve ↗
    </a>
  );
}

export default async function ProblemDetailPage({ params }) {
  params = await params;
  const problem = getProblemBundle(params.slug);
  if (!problem) notFound();
  const roadmapContext = getRoadmapContext(problem);
  // BUG-139: a pattern tag links out only when its page really exists.
  const validPatternSlugs = new Set(getPatternIndex().map((p) => p.slug));

  const jsonLd = [
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Problems', path: '/problems' },
      { name: problem.title, path: routes.problem(problem.slug) },
    ]),
    learningResourceSchema({
      name: problem.title,
      description: problem.explanation_short || problem.title,
      url: `/problems/${problem.slug}`,
      difficulty: problem.difficulty,
    }),
  ];

  return (
    <PageWrapper>
      <JsonLd data={jsonLd} />
      <div className={styles.wrapper}>
        <BackButton />

        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{problem.title}</h1>
            <BookmarkButton canonicalId={problem.canonical_id} />
          </div>

          <div className={styles.metaRow}>
            <DifficultyBadge score={problem.difficulty} showScore />
            {problem.frequency_score > 0 && (
              <span className={styles.frequencyBadge} title={`Frequency score ${problem.frequency_score}`}>{'\u{1F525}'}</span>
            )}
          </div>

          {/* Tags (topics from the problem's own labels) and Patterns (Atlas technique pages) are different things, so
              they get separate labelled rows instead of one mixed run of chips. */}
          {problem.topics_display?.length > 0 && (
            <div className={styles.tagGroup}>
              <span className={styles.tagGroupLabel}>Tags</span>
              {problem.topics_display.map((t) => <span key={t} className={styles.topicTag}>{t}</span>)}
            </div>
          )}
          {problem.patterns?.length > 0 && (
            <div className={styles.tagGroup}>
              <span className={styles.tagGroupLabel}>Patterns</span>
              {problem.patterns.map((p) => {
                const target = resolvePatternSlug(p, validPatternSlugs);
                return target
                  ? <Link key={p} href={`/patterns/${target}`} className={styles.patternTag}>{p}</Link>
                  : <span key={p} className={styles.patternTag}>{p}</span>;
              })}
            </div>
          )}

          {/* BUG FIX: askedAt is no longer capped upstream (build-content.mjs / build-companies.mjs both dropped
              their truncation), so a popular problem can list 40-60+ companies now - rendering every one as a flat
              chip would flood the page. CompanyChipRow does the "top 4 + N more" collapse instead, and shows real
              logos via each company's `domain` (already present on every askedAt entry). */}
          {problem.askedAt?.length > 0 && (
            <div className={styles.askedAtRow}>
              <span className={styles.askedAtLabel}>Asked at</span>
              <CompanyChipRow companies={problem.askedAt} />
            </div>
          )}

          <div className={styles.actions}>
            <ProgressButtons canonicalId={problem.canonical_id} />
            <SolveButton platforms={problem.source_platforms} />
          </div>
        </div>

        <RoadmapContext context={roadmapContext} />

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Explanation</h2>
          <ExplanationTabs shortText={problem.explanation_short} longText={problem.explanation_long} longStatus={problem.explanation_long_status} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Solutions</h2>
          <SolutionViewer slug={problem.slug} defaultSolution={problem.defaultSolution} checks={problem.checks} />
        </section>

        <div className={styles.disclosures}>
          <OriginalStatement description={problem.description} constraints={problem.constraints} />
          <ProblemExamples examples={problem.examples} />
        </div>
      </div>
    </PageWrapper>
  );
}

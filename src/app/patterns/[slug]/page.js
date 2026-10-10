import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPatternIndex, getPatternDetail, getAvailableNoteSlugs, getNoteContent, getCompanyIndex, getProblemBundle, getTopicPatternEntry, getTopicOnlyPatternSlugs } from '../../../lib/server/content.server.js';
import { PATTERN_NOTE_MAP } from '../../../lib/patternNoteMap.js';
import { resolvePatternSlug } from '../../../constants/patternAliases.js';
import { breadcrumbSchema } from '../../../lib/jsonld.js';
import { routes, canonicalAlternates } from '../../../lib/routeIdentity.js';
import JsonLd from '../../../components/JsonLd.jsx';
import CompanyChipRow from '../../../components/company/CompanyChipRow.jsx';
import PatternDetailClient from '../../../components/pattern/PatternDetailClient.jsx';
import styles from './PatternDetail.module.css';

export const dynamicParams = false;

export function generateStaticParams() {
  return [...getPatternIndex().map((p) => p.slug), ...getTopicOnlyPatternSlugs()].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  params = await params;
  const entry = getPatternDetail(params.slug) || getTopicPatternEntry(params.slug);
  if (!entry) return { title: 'Pattern not found' };
  const practiceCount = entry.practiceProblems?.length || 0;
  return {
    alternates: canonicalAlternates(routes.pattern(params.slug)),
    title: entry.pattern || params.slug,
    description: entry.companiesSeenIn === 0
      ? `${entry.totalProblemsInPool} Atlas problems tagged ${entry.pattern}.`
      : practiceCount > 0
      ? `${entry.totalProblemsInPool} problems carry the ${entry.pattern || params.slug} tag across ${entry.companiesSeenIn} companies - the top ${practiceCount}, ranked by how often companies ask them.`
      : `${entry.totalProblemsInPool} problems carry the ${entry.pattern || params.slug} tag across ${entry.companiesSeenIn} companies - no curated practice set yet.`,
  };
}

export default async function PatternDetailPage({ params }) {
  const { slug } = await params;
  const entry = getPatternDetail(slug) || getTopicPatternEntry(slug);
  if (!entry) notFound();
  const practiceCountOnPage = entry.practiceProblems?.length || 0;
  const rankingLabel = entry.companiesSeenIn > 0 ? 'how many companies ask them' : 'popularity';
  const isPartialPool = entry.totalProblemsInPool > practiceCountOnPage;

  const noteSlug = PATTERN_NOTE_MAP[slug];
  const hasNote = noteSlug && getAvailableNoteSlugs().has(noteSlug);
  const note = hasNote ? getNoteContent(noteSlug) : null;
  const noteIntro = note?.sections?.find((s) => s.type === 'intro');
  const noteSignals = note?.sections?.find((s) => s.type === 'when_to_use')?.signals || [];
  const noteComplexity = note?.sections?.find((s) => s.type === 'complexity');
  const notePitfall = note?.sections?.find((s) => s.type === 'pitfalls')?.items?.[0];
  const noteExampleSlugs = new Set((note?.sections?.find((s) => s.type === 'problems')?.items || []).map((p) => p.slug));

  const relatedPatterns = noteSlug
    ? Object.entries(PATTERN_NOTE_MAP)
        .filter(([s, n]) => n === noteSlug && s !== slug)
        .map(([s]) => getPatternIndex().find((p) => p.slug === s))
        .filter(Boolean)
        .slice(0, 6)
    : [];

  const companyNames = Object.fromEntries(getCompanyIndex().map((c) => [c.id, c.name]));
  const validPatternSlugs = new Set(getPatternIndex().map((p) => p.slug));

  const problems = (entry.practiceProblems || []).map((p) => {
    const bundle = getProblemBundle(p.atlasSlug);
    const alsoTagged = (bundle?.patterns || [])
      .map((name) => ({ name, slug: resolvePatternSlug(name, validPatternSlugs) }))
      .filter((t) => t.slug && t.slug !== slug)
      .filter((t, i, all) => all.findIndex((x) => x.slug === t.slug) === i);
    return { ...p, alsoTagged, inNote: noteExampleSlugs.has(p.atlasSlug) };
  });

  const companyFreq = new Map();
  for (const p of problems) for (const id of p.askedAt || []) companyFreq.set(id, (companyFreq.get(id) || 0) + 1);
  const topCompanies = [...companyFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => ({ id, name: companyNames[id] || id }));

  const jsonLd = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Patterns', path: routes.patterns() },
    { name: entry.pattern, path: routes.pattern(slug) },
  ]);

  return (
    <div className={styles.page}>
      <JsonLd data={jsonLd} />
      <Link className={styles.back} href="/patterns">&larr; All patterns</Link>

      <header className={styles.header}>
        <h1>{entry.pattern}</h1>
        <p className={styles.subtitle}>
          {entry.totalProblemsInPool} {entry.totalProblemsInPool === 1 ? 'problem carries' : 'problems carry'} this tag{entry.companiesSeenIn > 0 ? ` across ${entry.companiesSeenIn} companies` : ''}
          {practiceCountOnPage > 0
            ? isPartialPool
              ? ` - showing the top ${practiceCountOnPage}, ranked by ${rankingLabel}.`
              : ` - showing ${practiceCountOnPage === 1 ? 'it' : 'all of them'} below, ranked by ${rankingLabel}.`
            : ' - no curated practice set yet.'}
        </p>

        {noteComplexity && (
          <div className={styles.complexityGrid}>
            <div className={styles.complexityCard}>
              <span className={styles.complexityLabel}>Time</span>
              <p className={styles.complexityValue}>{noteComplexity.time}</p>
            </div>
            <div className={styles.complexityCard}>
              <span className={styles.complexityLabel}>Space</span>
              <p className={styles.complexityValue}>{noteComplexity.space}</p>
            </div>
          </div>
        )}

        {topCompanies.length > 0 && (
          <div className={styles.topCompaniesInline}>
            <span className={styles.topCompaniesLabel}>Most asked by</span>
            <CompanyChipRow companies={topCompanies} limit={5} />
          </div>
        )}
      </header>

      {note && (
        <div className={styles.noteCallout}>
          <div className={styles.noteCalloutHead}>
            <span className={styles.noteCalloutLabel}>How this works</span>
            {note.estimated_read && <span className={styles.noteCalloutMeta}>{note.estimated_read} read</span>}
          </div>
          {noteIntro && (
            <p className={styles.noteCalloutBody}>{noteIntro.content.replace(/[*_`#]/g, '').slice(0, 220)}&hellip;</p>
          )}
          {noteSignals.length > 0 && (
            <div className={styles.signalRow}>
              {noteSignals.slice(0, 4).map((s) => <span key={s} className={styles.signalChip}>{s}</span>)}
            </div>
          )}
          {notePitfall && <p className={styles.pitfallLine}><strong>Watch out:</strong> {notePitfall.replace(/`/g, '')}</p>}
          <div className={styles.noteCalloutFooter}>
            <Link href={`/notes/${noteSlug}`} className={styles.noteCalloutLink}>Read the full note &rarr;</Link>
            {relatedPatterns.length > 0 && (
              <div className={styles.relatedRow}>
                <span className={styles.relatedLabel}>Related:</span>
                {relatedPatterns.map((p) => (
                  <Link key={p.slug} href={`/patterns/${p.slug}`} className={styles.relatedChip}>{p.pattern}</Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {practiceCountOnPage === 0 ? (
        <p className={styles.emptyState}>No curated practice set for this pattern yet, even though {entry.companiesSeenIn} companies ask for it - check the pattern chips on individual company pages instead.</p>
      ) : (
        <>
          <h2 className={styles.sectionHeading}>Practice Problems <span className={styles.sectionCount}>({practiceCountOnPage})</span></h2>
          <PatternDetailClient problems={problems} companyNames={companyNames} />
        </>
      )}
    </div>
  );
}

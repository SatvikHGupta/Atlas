import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAvailableNoteSlugs, getNoteContent, getProblemBundle } from '../../../lib/server/content.server.js';
import { highlightCode } from '../../../lib/server/highlight.server.js';
import { renderNoteMarkdown } from '../../../lib/server/notesMarkdown.server.js';
import { NOTES_TOPICS_INDEX } from '../../../constants/notes.js';
import { getStarLevel, levelBadgeLabel } from '../../../lib/noteLevels.js';
import { breadcrumbSchema, articleSchema } from '../../../lib/jsonld.js';
import { routes, canonicalAlternates } from '../../../lib/routeIdentity.js';
import JsonLd from '../../../components/JsonLd.jsx';
import PageWrapper from '../../../components/layout/PageWrapper/PageWrapper.jsx';
import FlashCard from '../../../components/notes/FlashCard.jsx';
import styles from './NoteReader.module.css';

// BUG-125: only slugs in NOTES_TOPICS_INDEX exist, anything else is a 404.
export const dynamicParams = false;

// Only indexed slugs (each confirmed to have a content/notes/<slug>.json file) get a page - add a topic and its file and it appears on the next build automatically.
export function generateStaticParams() {
  return Array.from(getAvailableNoteSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  params = await params;
  const note = getNoteContent(params.slug);
  if (!note) return { title: 'Note not found' };
  return {
    alternates: canonicalAlternates(routes.note(params.slug)),
    title: note.topic,
    description: `In-depth DSA study guide: ${note.topic}.${note.estimated_read ? ` ~${note.estimated_read} read.` : ''}`,
  };
}

// BUG-149, 150: note Markdown goes through renderNoteMarkdown (lib/server/notesMarkdown.server.js): raw HTML is escaped, only http/https/mailto/#/relative URLs are emitted, and every code fence is Shiki-highlighted. No client JS or new dependency.
export default async function NoteReaderPage({ params }) {
  params = await params;
  const note = getNoteContent(params.slug);
  if (!note) notFound();

  const sections = await Promise.all(
    (note.sections || []).map(async (section) => ({
      ...section,
      _html: section.content ? await renderNoteMarkdown(section.content) : null,
      _codeHtml: section.type === 'template' && section.code
        ? await highlightCode(section.code, section.language || 'javascript')
        : null,
      // "problems" items only carry title/slug/difficulty/why - askedAt company data lives on the
      // problem's own content bundle, resolved here so FlashCard stays a plain presentational component.
      _resolvedProblems: section.type === 'problems' && section.items?.length
        ? section.items.map((p) => {
            const bundle = getProblemBundle(p.slug);
            return {
              ...p,
              href: bundle ? `/problems/${p.slug}` : `https://leetcode.com/problems/${p.slug}/`,
              isInternal: Boolean(bundle),
              companies: bundle?.askedAt || [],
            };
          })
        : null,
    }))
  );

  const jsonLd = [
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Notes', path: routes.notes() },
      { name: note.topic, path: routes.note(params.slug) },
    ]),
    articleSchema({
      headline: note.topic,
      description: `In-depth DSA study guide: ${note.topic}.`,
      url: `/notes/${params.slug}`,
    }),
  ];

  return (
    <PageWrapper>
      <JsonLd data={jsonLd} />
      <div className={styles.wrapper}>
        <Link href="/notes" className={styles.backBtn}>← Back</Link>

        <div className={styles.header}>
          <div className={styles.metaRow}>
            <span className={styles.levelBadge}>{levelBadgeLabel(note.level, getStarLevel(NOTES_TOPICS_INDEX))}</span>
            {note.estimated_read && <span className={styles.readTime}>⏱ {note.estimated_read} read</span>}
          </div>
          <h1 className={styles.title}>{note.topic}</h1>
        </div>

        <div className={styles.sections}>
          {sections.map((section, i) => <NoteSection key={i} section={section} />)}
        </div>
      </div>
    </PageWrapper>
  );
}

function NoteSection({ section }) {
  return (
    <section className={styles.section}>
      {section.title && <h2 className={styles.sectionTitle}>{section.title}</h2>}

      {section._html && (
        <div className="markdown-content" dangerouslySetInnerHTML={{ __html: section._html }} />
      )}

      {section.signals?.length > 0 && (
        <div className={styles.signals}>
          <span className={styles.signalsLabel}>Pattern signals:</span>
          <div className={styles.signalChips}>
            {section.signals.map((s, i) => <span key={i} className={styles.signal}>{s}</span>)}
          </div>
        </div>
      )}

      {section.type === 'template' && section._codeHtml && (
        <div className={styles.templateBlock}>
          <div dangerouslySetInnerHTML={{ __html: section._codeHtml }} />
          {section.explanation && <p className={styles.templateNote}>{section.explanation}</p>}
        </div>
      )}

      {section.type === 'complexity' && (
        <div className={styles.complexity}>
          <div className={styles.complexityItem}>
            <span className={styles.complexityLabel}>Time</span>
            <code className={styles.complexityValue}>{section.time}</code>
          </div>
          <div className={styles.complexityItem}>
            <span className={styles.complexityLabel}>Space</span>
            <code className={styles.complexityValue}>{section.space}</code>
          </div>
          {section.explanation && <p className={styles.complexityExplain}>{section.explanation}</p>}
        </div>
      )}

      {section.type === 'variants' && section.items?.length > 0 && (
        <div className={styles.variants}>
          {section.items.map((v, i) => (
            <div key={i} className={styles.variant}>
              <strong className={styles.variantName}>{v.name}</strong>
              <p className={styles.variantDesc}>{v.description}</p>
              {v.example_slug && (
                <Link href={`/problems/${v.example_slug}`} className={styles.variantLink}>
                  Example: {v.example_problem} →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {section.type === 'pitfalls' && section.items?.length > 0 && (
        <ul className={styles.pitfalls}>
          {section.items.map((p, i) => <li key={i} className={styles.pitfall}>⚠ {p}</li>)}
        </ul>
      )}

      {section.type === 'problems' && section._resolvedProblems?.length > 0 && (
        <div className={styles.problems}>
          {section._resolvedProblems.map((p, i) => (
            <FlashCard
              key={i}
              title={p.title}
              slug={p.slug}
              difficultyLabel={p.difficulty_label}
              why={p.why}
              href={p.href}
              companies={p.companies}
            />
          ))}
        </div>
      )}

      {section.type === 'progression' && section.next_slug && (
        <Link href={`/notes/${section.next_slug}`} className={styles.progression}>
          <div className={styles.progressionText}>
            <span className={styles.progressionLabel}>Next up</span>
            <span className={styles.progressionTopic}>{section.next_topic}</span>
            {section.why && <span className={styles.progressionWhy}>{section.why}</span>}
          </div>
          <span className={styles.progressionArrow}>→</span>
        </Link>
      )}
    </section>
  );
}

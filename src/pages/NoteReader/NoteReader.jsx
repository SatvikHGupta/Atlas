import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { notesService } from '../../services/notes.service.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import styles from './NoteReader.module.css';

marked.setOptions({ breaks: true, gfm: true });

const md = (text) => {
  if (!text) return '';
  return DOMPurify.sanitize(marked.parse(text));
};

export default function NoteReader() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['note', slug],
    queryFn:  () => notesService.getNote(slug),
    staleTime: 30 * 60 * 1000,
  });

  const note = data?.data;

  usePageTitle(note?.topic ? `${note.topic} - Notes` : 'Notes');

  if (isLoading) return <PageWrapper><div className={styles.loading}>Loading...</div></PageWrapper>;

  if (isError || !note) {
    return (
      <PageWrapper>
        <div className={styles.notFound}>
          <h2>Note not found</h2>
          <p>This topic note hasn't been generated yet, or the slug is incorrect.</p>
          <Link to="/notes" className={styles.backLink}>← Back to Notes</Link>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className={styles.wrapper}>
        {}
        <button className={styles.backBtn} onClick={() => navigate(-1)}>← Back</button>

        {}
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.metaRow}>
            <span className={styles.levelBadge}>Level {note.level === 8 ? '★' : note.level}</span>
            {note.estimated_read && (
              <span className={styles.readTime}>⏱ {note.estimated_read} read</span>
            )}
          </div>
          <h1 className={styles.title}>{note.topic}</h1>
        </motion.div>

        {}
        <div className={styles.sections}>
          {note.sections?.map((section, i) => (
            <NoteSection key={i} section={section} index={i} />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}

function NoteSection({ section, index }) {
  return (
    <motion.section
      className={styles.section}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      {section.title && <h2 className={styles.sectionTitle}>{section.title}</h2>}

      {}
      {section.content && (
        <div
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: md(section.content) }}
        />
      )}

      {}
      {section.signals?.length > 0 && (
        <div className={styles.signals}>
          <span className={styles.signalsLabel}>Pattern signals:</span>
          <div className={styles.signalChips}>
            {section.signals.map((s, i) => (
              <span key={i} className={styles.signal}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {}
      {section.type === 'template' && section.code && (
        <div className={styles.templateBlock}>
          <SyntaxHighlighter
            language={section.language || 'javascript'}
            style={vscDarkPlus}
            customStyle={{ margin: 0, borderRadius: 8, fontSize: '0.85rem', background: '#0d0d14' }}
            showLineNumbers
          >
            {section.code}
          </SyntaxHighlighter>
          {section.explanation && (
            <p className={styles.templateNote}>{section.explanation}</p>
          )}
        </div>
      )}

      {}
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
          {section.explanation && (
            <p className={styles.complexityExplain}>{section.explanation}</p>
          )}
        </div>
      )}

      {}
      {section.type === 'variants' && section.items?.length > 0 && (
        <div className={styles.variants}>
          {section.items.map((v, i) => (
            <div key={i} className={styles.variant}>
              <strong className={styles.variantName}>{v.name}</strong>
              <p className={styles.variantDesc}>{v.description}</p>
              {v.example_slug && (
                <Link to={`/problems/${v.example_slug}`} className={styles.variantLink}>
                  Example: {v.example_problem} →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {}
      {section.type === 'pitfalls' && section.items?.length > 0 && (
        <ul className={styles.pitfalls}>
          {section.items.map((p, i) => (
            <li key={i} className={styles.pitfall}>⚠ {p}</li>
          ))}
        </ul>
      )}

      {}
      {section.type === 'problems' && section.items?.length > 0 && (
        <div className={styles.problems}>
          {section.items.map((p, i) => (
            <Link key={i} to={`/problems/${p.slug}`} className={styles.problemCard}>
              <div className={styles.problemLeft}>
                <span
                  className={styles.diffDot}
                  style={{
                    background: p.difficulty <= 3 ? '#86efac' : p.difficulty <= 6 ? '#facc15' : '#ef4444',
                  }}
                />
                <span className={styles.problemTitle}>{p.title}</span>
              </div>
              <span className={styles.problemWhy}>{p.why}</span>
            </Link>
          ))}
        </div>
      )}

      {}
      {section.type === 'progression' && section.next_slug && (
        <Link to={`/notes/${section.next_slug}`} className={styles.progression}>
          <div className={styles.progressionText}>
            <span className={styles.progressionLabel}>Next up</span>
            <span className={styles.progressionTopic}>{section.next_topic}</span>
            {section.why && <span className={styles.progressionWhy}>{section.why}</span>}
          </div>
          <span className={styles.progressionArrow}>→</span>
        </Link>
      )}
    </motion.section>
  );
}

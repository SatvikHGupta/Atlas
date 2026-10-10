import styles from '../../app/companies/[id]/CompanyDetail.module.css';
import { toExternalUrl } from '../../lib/urlPolicy.js';

// Role families and research sources
export default function CompanyFootnotes({ data }) {
  const families = data.roleFamilies || [];
  const sources = (data.rolesSources || []).map((s) => ({ ...s, safe: toExternalUrl(s.url) })).filter((s) => s.safe);
  if (!families.length && !sources.length && !data.indiaNote && !data.rolesNotes) return null;

  return (
    <section className={styles.footnotes} aria-label="Role families and sources">
      {families.length > 0 && (
        <div className={styles.footBlock}>
          <h2 className={styles.sectionTitle}>Role families</h2>
          <div className={styles.ladderChips}>
            {families.map((f) => <span className={styles.ladderChip} key={f}>{f}</span>)}
          </div>
        </div>
      )}

      {(data.indiaNote || data.rolesNotes) && (
        <div className={styles.footBlock}>
          {data.indiaNote && <p className={styles.ladderMeta}><strong>India:</strong> {data.indiaNote}</p>}
          {data.rolesNotes && <p className={styles.ladderMeta}>{data.rolesNotes}</p>}
        </div>
      )}

      {sources.length > 0 && (
        <div className={styles.footBlock}>
          <h2 className={styles.sectionTitle}>
            Sources ({sources.length}) &middot; researched {data.rolesAsOf || 'n/a'}
            {data.rolesConfidence ? ` \u00b7 confidence: ${data.rolesConfidence}` : ''}
          </h2>
          <ul className={styles.sourceList}>
            {sources.map((s) => (
              <li key={s.safe}>
                <a className={styles.linkBtn} href={s.safe} target="_blank" rel="noopener noreferrer" title={s.safe}>
                  <span className={styles.linkBtnLabel}>{s.title || s.safe}</span>
                  <span className={styles.linkBtnHost}>{new URL(s.safe).hostname.replace(/^www\./, '')} &#8599;</span>
                </a>
                {s.used?.length ? <span className={styles.ladderUsed}> used for: {s.used.join(', ')}</span> : null}
              </li>
            ))}
          </ul>
          <p className={styles.ladderMeta}>Levels and interview formats change and vary by team. Treat this as a guide and check the company&apos;s careers page.</p>
        </div>
      )}
    </section>
  );
}

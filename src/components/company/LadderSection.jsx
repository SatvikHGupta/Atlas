import styles from '../../app/companies/[id]/CompanyDetail.module.css';

// Levels & roles: the company's engineering ladder
export default function LadderSection({ data }) {
  const ladder = data.ladder || [];
  if (!ladder.length) return null;

  return (
    <section className={styles.ladderSection}>
      <h2 className={styles.sectionTitle}>Levels &amp; roles</h2>

      <div className={styles.ladderTable} role="table" aria-label={`${data.name} engineering levels`}>
        {ladder.map((l) => (
          <div className={styles.ladderRow} role="row" key={`${l.level}-${l.title}`}>
            <span className={styles.ladderLevel} role="cell">{l.level}</span>
            <span className={styles.ladderTitle} role="cell">{l.title}</span>
            <span className={styles.ladderExp} role="cell">{l.experience || ''}</span>
            {l.notes ? <span className={styles.ladderNote} role="cell">{l.notes}</span> : null}
          </div>
        ))}
      </div>

    </section>
  );
}

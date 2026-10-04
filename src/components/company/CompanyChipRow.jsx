import Link from 'next/link';
import CompanyBadge from './CompanyBadge.jsx';
import styles from './CompanyChipRow.module.css';

// companies: [{ id, name, domain, logo }]. `domain`/`logo` are optional (older callers may omit them) - CompanyBadge just falls
// back to the initials badge when it's missing, same as everywhere else. Top `limit` shown as real linked badges,
// the rest collapse into a
// "+N more" pill that reveals the remaining names on hover/focus - pure CSS, no JS state needed,
// so this works inside server components too, not just client ones.
export default function CompanyChipRow({ companies, limit = 4 }) {
  if (!companies?.length) return null;
  const shown = companies.slice(0, limit);
  const hidden = companies.slice(limit);

  return (
    <div className={styles.row}>
      {shown.map((c) => (
        <Link key={c.id} href={`/companies/${c.id}`} className={styles.chip}>
          <CompanyBadge name={c.name} domain={c.domain} logo={c.logo} size={20} />
          <span>{c.name}</span>
        </Link>
      ))}
      {hidden.length > 0 && (
        <span className={styles.more} tabIndex={0}>
          +{hidden.length} more
          <span className={styles.tooltip} role="tooltip">{hidden.map((c) => c.name).join(', ')}</span>
        </span>
      )}
    </div>
  );
}

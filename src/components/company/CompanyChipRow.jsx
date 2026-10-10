import Link from 'next/link';
import CompanyBadge from './CompanyBadge.jsx';
import styles from './CompanyChipRow.module.css';

// companies: [{ id, name, domain, logo }]
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

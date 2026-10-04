import { toExternalUrl } from '../../lib/urlPolicy.js';
import styles from '../../app/companies/[id]/CompanyDetail.module.css';

// Every outbound link we hold for a company, as a visible button with its label AND host spelled out (nothing is truncated
// or hidden behind an icon). Only http(s) URLs pass (urlPolicy), so a bad data value can never become a javascript: link.
function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

export function companyLinkList(data) {
  const items = [
    { label: 'Website', url: data.website },
    { label: 'Careers', url: data.careersUrl },
    { label: 'LinkedIn', url: data.linkedin },
    { label: 'Problem list (GitHub)', url: data.sourceCsv, hint: data.dataSnapshot?.label },
    ...(Array.isArray(data.sourceCsvExtra) ? data.sourceCsvExtra.map((u, i) => ({ label: `Extra problem list ${i + 1}`, url: typeof u === 'string' ? u : u?.url })) : []),
    { label: 'Data source repo', url: data.dataSnapshot?.repo },
  ];
  const seen = new Set();
  return items
    .map((i) => ({ ...i, url: toExternalUrl(i.url) }))
    .filter((i) => i.url && !seen.has(i.url) && seen.add(i.url));
}

export default function CompanyLinks({ data }) {
  const links = companyLinkList(data);
  if (!links.length) return null;
  return (
    <nav className={styles.linkRow} aria-label={`${data.name} links`}>
      {links.map((l) => (
        <a key={l.url} className={styles.linkBtn} href={l.url} target="_blank" rel="noopener noreferrer" title={l.hint ? `${l.url} - ${l.hint}` : l.url}>
          <span className={styles.linkBtnLabel}>{l.label}</span>
          <span className={styles.linkBtnHost}>{host(l.url)} &#8599;</span>
        </a>
      ))}
    </nav>
  );
}

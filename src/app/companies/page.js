import { getCompanyIndex } from '../../lib/server/content.server.js';
import CompanyBrowser from '../../components/company/CompanyBrowser.jsx';
import styles from './CompanyList.module.css';
import { routes, canonicalAlternates } from '../../lib/routeIdentity.js';

// Count comes from the actual data file
export function generateMetadata() {
  const count = getCompanyIndex().length;
  return {
    alternates: canonicalAlternates(routes.companies()),
    title: 'Companies',
    description: `What ${count} companies actually ask in interviews - problems, role-specific rounds, and the DSA patterns each one leans on most, sourced from LeetCode\u2019s company tags plus dated interview reports.`,
  };
}

export default function CompaniesPage() {
  const companies = getCompanyIndex();

  return (
    <div className={styles.page}>
      <div className={styles.headerGlow} aria-hidden="true" />
      <header className={styles.header}>
        <h1>Company Interview Patterns</h1>
        <p className={styles.subtitle}>
          What gets asked, where, and how often - sources are inside each company page plus dated interview reports, not guesswork.
        </p>
      </header>

      <CompanyBrowser companies={companies} />
    </div>
  );
}

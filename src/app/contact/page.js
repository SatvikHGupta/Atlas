// Contact page: its own layout (not the legal prose shell). Author: Satvik Hemant Gupta
import BackButton from '../../components/ui/BackButton/BackButton.jsx';
import { routes, canonicalAlternates } from '../../lib/routeIdentity.js';
import styles from './Contact.module.css';

export const metadata = {
  alternates: canonicalAlternates(routes.contact()),
  title: 'Contact',
  description: 'How to reach the person who builds Atlas.',
};

const ICONS = {
  mail: <path d="M3 6.5h18v11H3zM3.5 7l8.5 6.5L20.5 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />,
  linkedin: <path fill="currentColor" d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z" />,
  github: <path fill="currentColor" d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.48 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .3" />,
};

// add or edit contact links here
const LINKS = [
  { icon: 'mail', label: 'Email', value: 'satvikhgupta@gmail.com', note: 'Best for bugs, feedback and anything longer', href: 'mailto:satvikhgupta@gmail.com' },
  { icon: 'linkedin', label: 'LinkedIn', value: 'in/shg975', note: 'Say hello or connect', href: 'https://www.linkedin.com/in/shg975' },
  { icon: 'github', label: 'GitHub', value: 'SatvikHGupta', note: 'Code and other projects', href: 'https://github.com/SatvikHGupta' },
];

const REASONS = [
  ['Found a bug', 'Tell me the page, what you did and what you expected.'],
  ['Wrong or missing problem', 'A bad solution, a broken link or a company that should be here.'],
  ['An idea', 'A feature or a change that would make practice easier.'],
];

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <BackButton fallback="/settings" />

      <header className={styles.hero}>
        <h1>Let&apos;s talk about Atlas</h1>
        <p>Atlas is built and maintained by Satvik Hemant Gupta. Pick whichever channel suits you.</p>
      </header>

      <ul className={styles.grid}>
        {LINKS.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              className={styles.card}
              {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              <span className={styles.icon}>
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">{ICONS[l.icon]}</svg>
              </span>
              <span className={styles.body}>
                <span className={styles.label}>{l.label}</span>
                <span className={styles.value}>{l.value}</span>
                <span className={styles.note}>{l.note}</span>
              </span>
              <span className={styles.arrow} aria-hidden="true">&#8599;</span>
            </a>
          </li>
        ))}
      </ul>

      <section className={styles.reasons} aria-labelledby="reasons-title">
        <h2 id="reasons-title">What is worth writing about</h2>
        <ul>
          {REASONS.map(([title, text]) => (
            <li key={title}><b>{title}</b><span>{text}</span></li>
          ))}
        </ul>
      </section>
    </main>
  );
}

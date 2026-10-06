'use client';

// Sidebar for the Settings pages. Real links (one URL per section), so the browser back button, deep links and
// "open in new tab" all work. The list comes from constants/settingsSections.js. Author: Satvik Hemant Gupta
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SETTINGS_SECTIONS, settingsPath } from '../../../constants/settingsSections.js';
import styles from './SettingsNav.module.css';

export default function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Settings sections">
      {SETTINGS_SECTIONS.map((s) => {
        const active = pathname === settingsPath(s.slug) || pathname.startsWith(`${settingsPath(s.slug)}/`);
        return (
          <Link
            key={s.slug}
            href={settingsPath(s.slug)}
            className={`${styles.tab} ${active ? styles.active : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {s.label}
          </Link>
        );
      })}
      {/* not settings pages, so plain buttons under the list */}
      <div className={styles.legalGroup}>
        <Link href="/terms" className={styles.legalBtn}>Terms</Link>
        <Link href="/privacy" className={styles.legalBtn}>Privacy</Link>
        <Link href="/about" className={styles.legalBtn}>About</Link>
        <Link href="/contact" className={styles.legalBtn}>Contact</Link>
      </div>
    </nav>
  );
}

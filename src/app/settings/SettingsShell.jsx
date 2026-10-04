'use client';

// Frame shared by every /settings/* page: heading, sidebar, content card and the sign-in gate. A page only renders its
// own tab component; whether the visitor may see it is decided here from constants/settingsSections.js.
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth.js';
import PageWrapper from '../../components/layout/PageWrapper/PageWrapper.jsx';
import { Loader } from '../../components/ui/Loader/Loader.jsx';
import SettingsNav from '../../components/settings/SettingsNav/SettingsNav.jsx';
import { sectionForPath } from '../../constants/settingsSections.js';
import styles from './Settings.module.css';

export default function SettingsShell({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const section = sectionForPath(pathname);
  const locked = !!section?.requiresAuth && !isAuthenticated;

  if (loading) {
    return <PageWrapper><div className={styles.loading}><Loader size={32} /></div></PageWrapper>;
  }

  return (
    <PageWrapper>
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <h1>Settings</h1>
          <p>Your profile, theme, and account preferences.</p>
        </header>

        <div className={styles.layout}>
          <SettingsNav />

          <div className={styles.content}>
            {locked ? (
              <div className={styles.signInPrompt}>
                <p>Sign in to see your {section.label.toLowerCase()} settings.</p>
                <button type="button" className={styles.signInBtn} onClick={() => router.push(`/login?from=${encodeURIComponent(pathname)}`)}>
                  Sign in with Google
                </button>
              </div>
            ) : children}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

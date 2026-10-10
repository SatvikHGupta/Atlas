'use client';

// Mobile navigation (<= 768px): four tabs plus a More sheet. Author: Satvik Hemant Gupta
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth.js';
import { useInstallPrompt } from '../../../hooks/useInstallPrompt.js';
import { useUIStore } from '../../../store/ui.store.js';
import { authErrorMessage } from '../../../lib/authErrors.js';
import { BOTTOM_PRIMARY, MORE_LINKS, isActivePath } from '../../../constants/navLinks.js';
import BottomSheet from '../../ui/BottomSheet/BottomSheet.jsx';
import styles from './BottomNav.module.css';

// Install app row is parked for now - flip to true when the install flow is ready to ship
const SHOW_INSTALL_IN_MORE = false;

const ICONS = {
  '/problems': <path d="M4 6h16M4 12h16M4 18h10" />,
  '/cp': <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12" />,
  '/roadmap': <path d="M3 6.5l6-2 6 2 6-2v13l-6 2-6-2-6 2zM9 4.5v13M15 6.5v13" />,
  '/dashboard': <path d="M5 20v-9M12 20V4M19 20v-6" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3" />,
};

function TabIcon({ name }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { user, signInWithGoogle, signOut } = useAuth();
  const { canPrompt, iosGuide, standalone, install } = useInstallPrompt();
  const addToast = useUIStore((s) => s.addToast);
  const [openPath, setOpenPath] = useState(null);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const open = openPath === pathname; // the sheet closes by itself when the page changes

  const close = () => { setOpenPath(null); setShowIosSteps(false); };
  const moreActive = MORE_LINKS.some((l) => isActivePath(pathname, l.to));

  const handleSignIn = async () => {
    close();
    const result = await signInWithGoogle();
    if (result && result.ok === false) {
      const message = authErrorMessage(result.error?.code);
      if (message) addToast(message, 'error');
    }
  };

  const handleInstall = async () => {
    if (canPrompt) { close(); await install(); return; }
    setShowIosSteps((v) => !v);
  };

  return (
    <>
      <nav className={styles.bar} aria-label="Primary">
        {BOTTOM_PRIMARY.map(({ to, short }) => {
          const active = isActivePath(pathname, to);
          return (
            <Link key={to} href={to} className={styles.item} data-active={active} aria-current={active ? 'page' : undefined}>
              <TabIcon name={to} />
              <span>{short}</span>
            </Link>
          );
        })}
        <button type="button" className={styles.item} data-active={moreActive || open} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpenPath(open ? null : pathname)}>
          <TabIcon name="more" />
          <span>More</span>
        </button>
      </nav>

      <BottomSheet open={open} onClose={close} title="More">
        <div className={styles.moreList}>
          {MORE_LINKS.map(({ to, label }) => (
            <Link key={to} href={to} className={styles.moreRow} data-active={isActivePath(pathname, to)} aria-current={isActivePath(pathname, to) ? 'page' : undefined}>
              {label}
            </Link>
          ))}

          {SHOW_INSTALL_IN_MORE && !standalone && (canPrompt || iosGuide) && (
            <>
              <button type="button" className={styles.moreRow} onClick={handleInstall} aria-expanded={iosGuide && !canPrompt ? showIosSteps : undefined}>
                Install app
              </button>
              {showIosSteps && (
                <ol className={styles.iosSteps}>
                  <li>Tap the Share button in Safari</li>
                  <li>Choose &ldquo;Add to Home Screen&rdquo;</li>
                  <li>Keep &ldquo;Open as Web App&rdquo; on and tap Add</li>
                </ol>
              )}
            </>
          )}

          {user ? (
            <button type="button" className={styles.moreRow} onClick={() => { close(); signOut(); }}>Sign out</button>
          ) : (
            <button type="button" className={`${styles.moreRow} ${styles.moreAccent}`} onClick={handleSignIn}>Sign in with Google</button>
          )}
        </div>
      </BottomSheet>
    </>
  );
}

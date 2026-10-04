'use client';

// Mobile navigation (<= 768px). The Navbar hides its link row on small screens and this component replaces it, which is
// the contract the rest of the app already pays for (every page reserves --bottom-nav-height of bottom padding).
// ATLAS-BUG-006. Author: Satvik Hemant Gupta
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth.js';
import { useUIStore } from '../../../store/ui.store.js';
import { authErrorMessage } from '../../../lib/authErrors.js';
import { BOTTOM_PRIMARY, BOTTOM_MORE, isActivePath } from '../../../constants/navLinks.js';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const pathname = usePathname();
  const { user, signInWithGoogle, signOut } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  // the sheet is "open for one pathname": navigating changes pathname, which closes it without an effect
  const [openPath, setOpenPath] = useState(null);
  const open = openPath === pathname;
  const wrapRef = useRef(null);
  const moreBtnRef = useRef(null);
  const panelId = useId();

  // outside tap and Escape close it; Escape returns focus to the button (keyboard users do not get lost)
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenPath(null); };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setOpenPath(null);
      moreBtnRef.current?.focus();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const moreActive = BOTTOM_MORE.some((l) => isActivePath(pathname, l.to)) || isActivePath(pathname, '/settings');

  const handleSignIn = async () => {
    setOpenPath(null);
    const result = await signInWithGoogle();
    if (result && result.ok === false) {
      const message = authErrorMessage(result.error?.code);
      if (message) addToast(message, 'error');
    }
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {open && (
        <div id={panelId} className={styles.sheet} role="group" aria-label="More navigation">
          {BOTTOM_MORE.map(({ to, label }) => (
            <Link key={to} href={to} className={styles.sheetLink} data-active={isActivePath(pathname, to)} aria-current={isActivePath(pathname, to) ? 'page' : undefined}>
              {label}
            </Link>
          ))}
          <Link href="/settings" className={styles.sheetLink} data-active={isActivePath(pathname, '/settings')}>Settings</Link>
          {user ? (
            <button type="button" className={styles.sheetLink} onClick={() => { setOpenPath(null); signOut(); }}>Sign out</button>
          ) : (
            <button type="button" className={styles.sheetLink} onClick={handleSignIn}>Sign in</button>
          )}
        </div>
      )}

      <nav className={styles.bar} aria-label="Primary">
        {BOTTOM_PRIMARY.map(({ to, short }) => {
          const active = isActivePath(pathname, to);
          return (
            <Link key={to} href={to} className={styles.item} data-active={active} aria-current={active ? 'page' : undefined}>
              {short}
            </Link>
          );
        })}
        <button
          type="button"
          ref={moreBtnRef}
          className={styles.item}
          data-active={moreActive || open}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpenPath(open ? null : pathname)}
        >
          More
        </button>
      </nav>
    </div>
  );
}

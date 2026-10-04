'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth.js';
import { useUIStore } from '../../../store/ui.store.js';
import { authErrorMessage } from '../../../lib/authErrors.js';
import { NAV_LINKS, isActivePath } from '../../../constants/navLinks.js';
import GearIcon from './GearIcon.jsx';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();
  const { user, signInWithGoogle, signOut } = useAuth();
  const addToast = useUIStore((s) => s.addToast);

  // BUG-07: surface sign-in failures (popup blocked, network...) instead of swallowing the result
  const handleSignIn = async () => {
    const result = await signInWithGoogle();
    if (result && result.ok === false) {
      const message = authErrorMessage(result.error?.code);
      if (message) addToast(message, 'error');
    }
  };

  const isActive = (to) => isActivePath(pathname, to);

  return (
    <nav className={styles.nav}>
      <div className={styles.left}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span className={styles.logoText}>Atlas</span>
        </Link>
      </div>

      <div className={styles.links}>
        {NAV_LINKS.map(({ to, label }) => (
          <Link key={to} href={to} className={styles.link} data-active={isActive(to)}>
            {label}
            {isActive(to) && (
              <motion.span
                layoutId="nav-indicator"
                className={styles.navIndicator}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </Link>
        ))}
      </div>

      <div className={styles.right}>
        {user ? (
          <div className={styles.userArea}>
            <Link href="/settings" className={styles.avatarLink} aria-label="Settings">
              <GearIcon size={34} className={styles.navGear} />
              <span className={styles.avatarInGear}>
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote avatar, images.unoptimized is on
                  <img src={user.photoURL} alt="" className={styles.avatarImg} referrerPolicy="no-referrer" />
                ) : (
                  <span className={styles.avatarFallback}>{(user.displayName || '?')[0].toUpperCase()}</span>
                )}
              </span>
            </Link>
            <button className={styles.signOutBtn} onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <div className={styles.signedOutArea}>
            <Link href="/settings" className={styles.gearBtn} aria-label="Settings">
              <GearIcon size={22} />
            </Link>
            <button className={styles.signInBtn} onClick={handleSignIn}>Sign in</button>
          </div>
        )}
      </div>
    </nav>
  );
}

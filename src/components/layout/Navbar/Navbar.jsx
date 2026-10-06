'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth.js';
import { useUIStore } from '../../../store/ui.store.js';
import { authErrorMessage } from '../../../lib/authErrors.js';
import { NAV_LINKS, isActivePath } from '../../../constants/navLinks.js';
import GearIcon from './GearIcon.jsx';
import styles from './Navbar.module.css';

// first letter of the name (or email) for users with no photo
const initialOf = (user) => (user.displayName || user.email || '?').trim()[0].toUpperCase();

export default function Navbar() {
  const pathname = usePathname();
  const [photoBroken, setPhotoBroken] = useState(false); // photo URL failed to load, show the letter instead
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

      {/* Same markup for both states: the auth button has a fixed width and the 40px gear is always the last item,
          so nothing moves when you sign in or out. */}
      <div className={styles.right}>
        {user ? (
          <button className={styles.authBtn} onClick={signOut}>Sign out</button>
        ) : (
          <button className={`${styles.authBtn} ${styles.signIn}`} onClick={handleSignIn}>Sign in</button>
        )}
        <Link href="/settings" className={styles.gearLink} aria-label="Settings">
          {user && (
            <span className={styles.avatarInGear}>
              {user.photoURL && !photoBroken ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote avatar, images.unoptimized is on
                <img
                  src={user.photoURL}
                  alt=""
                  className={styles.avatarImg}
                  referrerPolicy="no-referrer"
                  onError={() => setPhotoBroken(true)}
                />
              ) : (
                <span className={styles.avatarFallback}>{initialOf(user)}</span>
              )}
            </span>
          )}
          <GearIcon size={40} className={styles.navGear} />
        </Link>
      </div>
    </nav>
  );
}

import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.js';
import styles from './Navbar.module.css';

const NAV_LINKS = [
  { to: '/problems',  label: 'DSA Problems' },
  { to: '/cp',        label: 'CP Problems' },
  { to: '/roadmap',   label: 'Roadmap' },
  { to: '/notes',     label: 'Notes' },
  { to: '/dashboard', label: 'Dashboard' },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, signInWithGoogle, signOut } = useAuth();

  const isActive = (to) => {
    if (to === '/problems') return pathname === '/problems';
    if (to === '/cp')       return pathname === '/cp';
    return pathname.startsWith(to);
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.left}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span className={styles.logoText}>Atlas</span>
        </Link>
      </div>

      {/* desktop links - hidden on mobile */}
      <div className={styles.links}>
        {NAV_LINKS.map(({ to, label }) => (
          <Link key={to} to={to} className={styles.link} data-active={isActive(to)}>
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
            {user.photoURL && (
              <img src={user.photoURL} alt="avatar" className={styles.avatar} referrerPolicy="no-referrer" />
            )}
            <button className={styles.signOutBtn} onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <button className={styles.signInBtn} onClick={signInWithGoogle}>
            Sign in
          </button>
        )}
      </div>
    </nav>
  );
}

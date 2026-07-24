import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../../hooks/useAuth.js';
import styles from './BottomNav.module.css';

const TABS = [
  { to: '/problems', label: 'DSA',      icon: '⊞' },
  { to: '/cp',       label: 'CP',       icon: '⚡' },
  { to: '/roadmap',  label: 'Roadmap',  icon: '◎' },
  { to: '/notes',    label: 'Notes',    icon: '📖' },
  { to: null,        label: 'More',     icon: '⋯', isMore: true },
];

const MORE_ITEMS = [
  { to: '/dashboard', label: 'Dashboard',  icon: '▦' },
  { to: '/bookmarks', label: 'Bookmarks',  icon: '★' },
  { to: '/history',   label: 'History',    icon: '⏱' },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (to) => {
    if (!to) return false;
    if (to === '/problems') return pathname === '/problems';
    if (to === '/cp')       return pathname === '/cp';
    return pathname.startsWith(to);
  };

  const isMoreActive = MORE_ITEMS.some((item) => pathname.startsWith(item.to));

  return (
    <>
      {/* backdrop */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* more sheet - data-no-swipe prevents useSwipeNav triggering inside */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className={styles.moreSheet}
            data-no-swipe="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 200 || info.offset.y > 80) setMoreOpen(false);
            }}
          >
            <div className={styles.sheetHandle} />
            <div className={styles.sheetTitle}>More</div>

            <div className={styles.sheetItems}>
              {MORE_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={styles.sheetItem}
                  data-active={pathname.startsWith(item.to)}
                  onClick={() => setMoreOpen(false)}
                >
                  <span className={styles.sheetItemIcon}>{item.icon}</span>
                  <span className={styles.sheetItemLabel}>{item.label}</span>
                  <span className={styles.sheetItemArrow}>›</span>
                </Link>
              ))}
            </div>

            {user && (
              <div className={styles.sheetFooter}>
                <div className={styles.userInfo}>
                  {user.photoURL && (
                    <img src={user.photoURL} alt="avatar" className={styles.sheetAvatar} referrerPolicy="no-referrer" />
                  )}
                  <span className={styles.userEmail}>{user.displayName || user.email}</span>
                </div>
                <button
                  className={styles.signOutBtn}
                  onClick={() => { signOut(); setMoreOpen(false); }}
                >
                  Sign out
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* bottom tab bar */}
      <nav className={styles.nav}>
        {TABS.map(({ to, label, icon, isMore }) => {
          const active = isMore ? isMoreActive || moreOpen : isActive(to);

          if (isMore) {
            return (
              <button
                key="more"
                className={styles.tab}
                data-active={active}
                onClick={() => setMoreOpen((v) => !v)}
                aria-label="More options"
              >
                <span className={styles.tabIcon}>{icon}</span>
                <span className={styles.tabLabel}>{label}</span>
                {active && (
                  <motion.span
                    layoutId="bottom-nav-indicator"
                    className={styles.tabIndicator}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          }

          return (
            <Link
              key={to}
              to={to}
              className={styles.tab}
              data-active={active}
              aria-label={label}
            >
              <span className={styles.tabIcon}>{icon}</span>
              <span className={styles.tabLabel}>{label}</span>
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className={styles.tabIndicator}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

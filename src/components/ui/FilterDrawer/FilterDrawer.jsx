import { useRef, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import FilterBar from '../../filters/FilterBar/FilterBar.jsx';
import styles from './FilterDrawer.module.css';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function FilterDrawer({ open, onClose }) {
  const sheetRef = useRef(null);
  const titleId = useId();

  // Dialog behavior: move focus in on open, restore it on close, trap Tab
  // inside the sheet while open, and let Escape close it — none of this
  // came for free from motion.div, it's a plain div underneath.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement;
    const sheet = sheetRef.current;
    sheet?.querySelector(FOCUSABLE)?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !sheet) return;

      const focusables = sheet.querySelectorAll(FOCUSABLE);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />

          {/* sheet - data-no-swipe prevents useSwipeNav from firing inside */}
          <motion.div
            ref={sheetRef}
            className={styles.sheet}
            data-no-swipe="true"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.velocity.y > 250 || info.offset.y > 100) onClose();
            }}
          >
            {/* drag handle */}
            <div className={styles.handle} />

            {/* header */}
            <div className={styles.header}>
              <span className={styles.title} id={titleId}>Filters</span>
              <button className={styles.doneBtn} onClick={onClose}>Done</button>
            </div>

            {/* FilterBar inside the drawer */}
            <div className={styles.content}>
              <FilterBar inDrawer />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

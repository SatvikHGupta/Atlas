'use client';

// Slide-up sheet used for filters and the More menu. Drag the handle down, press Back or Escape to close.
import { useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import styles from './BottomSheet.module.css';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// While open, the sheet owns one history entry so Back closes it, not the page
function useBackToClose(open, onClose, enabled) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    if (!open || !enabled) return undefined;
    let pushed = false;
    try {
      window.history.pushState({ ...(window.history.state || {}), atlasSheet: true }, '', window.location.href);
      pushed = true;
    } catch { /* history is not available: Back simply leaves the page */ }
    // only a pop that lands on an entry WITHOUT our flag means the user went Back past the sheet
    const onPop = () => { if (!window.history.state?.atlasSheet) closeRef.current(); };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (pushed && window.history.state?.atlasSheet) window.history.back(); // closed from the UI, drop our entry
    };
  }, [open, enabled]);
}

// onClear (optional) adds a Clear button on the left of the header: [Clear] [title] [Done].
// It stays visible but disabled while clearDisabled is true.
export default function BottomSheet({ open, onClose, title, doneLabel = 'Done', closeOnBack = true, onClear, clearDisabled = false, clearLabel = 'Clear', children }) {
  const sheetRef = useRef(null);
  const titleId = useId();
  const controls = useDragControls();
  useBackToClose(open, onClose, closeOnBack);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const sheet = sheetRef.current;
    sheet?.focus({ preventScroll: true }); // the sheet itself, so a search box does not pop the keyboard open

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !sheet) return;
      const items = sheet.querySelectorAll(FOCUSABLE);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            className={styles.sheet}
            data-no-swipe="true"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            drag="y"
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(_, info) => { if (info.velocity.y > 250 || info.offset.y > 100) onClose(); }}
          >
            <div className={styles.grab} onPointerDown={(e) => controls.start(e)}>
              <div className={styles.handle} />
              <div className={styles.header} data-has-clear={!!onClear}>
                {onClear && (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    disabled={clearDisabled}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={onClear}
                  >{clearLabel}</button>
                )}
                <span className={styles.title} id={titleId}>{title}</span>
                <button type="button" className={styles.doneBtn} onPointerDown={(e) => e.stopPropagation()} onClick={onClose}>{doneLabel}</button>
              </div>
            </div>
            <div className={styles.content}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

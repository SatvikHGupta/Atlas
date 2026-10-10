'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { marked } from 'marked';
import { sanitizeHtml } from '../../../lib/sanitizeHtml.js';
import styles from './ExplanationTabs.module.css';

marked.setOptions({ breaks: true, gfm: true });

function renderMd(md) {
  if (!md) return '';
  return sanitizeHtml(marked.parse(md), 'markdown');
}

const TABS = ['Quick Look', 'Full Breakdown'];

export default function ExplanationTabs({ shortText, longText, longStatus }) {
  const [activeTab, setActiveTab] = useState(0);
  const dragStartX = useRef(null);

  if (!shortText && !longText) return null;

  const tabs = [shortText || '', longText || ''];

  const handleTouchStart = (e) => {
    dragStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (dragStartX.current === null) return;
    const delta = dragStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      if (delta > 0 && activeTab < TABS.length - 1) setActiveTab(activeTab + 1);
      if (delta < 0 && activeTab > 0) setActiveTab(activeTab - 1);
    }
    dragStartX.current = null;
  };

  return (
    <div className={styles.container}>
      <div className={styles.tabBar} role="tablist" aria-label="Explanation">
        {TABS.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={activeTab === i}
            className={styles.tab}
            data-active={activeTab === i}
            onClick={() => setActiveTab(i)}
          >
            {label}
            {activeTab === i && (
              <motion.span
                layoutId="explanation-tab-indicator"
                className={styles.tabIndicator}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {longStatus === 'truncated' && activeTab === 1 && (
        <p className={styles.notice} role="note">
          This breakdown was cut off while it was being generated. The Quick Look tab has the complete summary.
        </p>
      )}

      <p className={styles.swipeHint} aria-hidden="true">← swipe to switch tabs →</p>

      <div
        className={styles.swipeContainer}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: activeTab === 0 ? 20 : -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={styles.swipePane}
          >
            <div
              className={styles.prose}
              dangerouslySetInnerHTML={{ __html: renderMd(tabs[activeTab]) }}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

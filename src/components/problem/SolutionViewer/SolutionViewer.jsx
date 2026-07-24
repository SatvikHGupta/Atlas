import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'motion/react';
import styles from './SolutionViewer.module.css';

const LANGUAGES = [
  { key: 'javascript', label: 'JavaScript', highlight: 'javascript' },
  { key: 'cpp',        label: 'C/C++',      highlight: 'cpp' },
  { key: 'java',       label: 'Java',       highlight: 'java' },
  { key: 'python',     label: 'Python',     highlight: 'python' },
];

// solutions shape: { javascript: {algoCode, algoComplexity, optimalCode, optimalComplexity}, cpp: {...}, java: {...}, python: {...} }
export default function SolutionViewer({ solutions = {} }) {
  const [activeLang, setActiveLang]       = useState('javascript');
  const [activeVariant, setActiveVariant] = useState('algo');
  const [copied, setCopied]               = useState(false);

  // reveal state is shared across languages (per variant)- once you've given up
  // on "algorithm" for one language, seeing it in another isn't a new spoiler.
  const [revealed, setRevealed] = useState({ algo: false, optimal: false });

  const activeLangMeta = LANGUAGES.find((l) => l.key === activeLang) || LANGUAGES[0];
  const langData       = solutions[activeLang] || {};

  const currentCode       = activeVariant === 'algo' ? langData.algoCode : langData.optimalCode;
  const currentComplexity = activeVariant === 'algo' ? langData.algoComplexity : langData.optimalComplexity;
  const isRevealed        = revealed[activeVariant];

  const handleReveal = () => {
    setRevealed((prev) => ({ ...prev, [activeVariant]: true }));
  };

  const handleCopy = async () => {
    if (!currentCode || !isRevealed) return;
    await navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.wrapper}>
      {}
      <div className={styles.langTabs}>
        {LANGUAGES.map(({ key, label }) => (
          <button
            key={key}
            className={styles.langTab}
            data-active={activeLang === key}
            onClick={() => setActiveLang(key)}
          >
            {label}
            {activeLang === key && (
              <motion.span
                layoutId="solution-lang-indicator"
                className={styles.langTabIndicator}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      <div className={styles.header}>
        <div className={styles.tabs}>
          {[
            { key: 'algo',    label: 'Algorithm' },
            { key: 'optimal', label: 'Optimal' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={styles.tab}
              data-active={activeVariant === key}
              onClick={() => setActiveVariant(key)}
            >
              {label}
              {activeVariant === key && (
                <motion.span
                  layoutId="solution-tab-indicator"
                  className={styles.tabIndicator}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {currentComplexity && isRevealed && (
          <motion.div
            className={styles.complexity}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className={styles.complexityBadge}>
              Time: <strong>{currentComplexity.time}</strong>
            </span>
            <span className={styles.complexityBadge}>
              Space: <strong>{currentComplexity.space}</strong>
            </span>
          </motion.div>
        )}

        <button
          className={styles.copyBtn}
          onClick={handleCopy}
          disabled={!isRevealed || !currentCode}
          title={isRevealed ? 'Copy code' : 'Reveal the solution first'}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeLang + activeVariant}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={styles.codeWrap}
        >
          {currentCode ? (
            <div className={styles.codeContainer}>
              {}
              {!isRevealed && (
                <div className={styles.blurOverlay}>
                  <div className={styles.revealPrompt}>
                    <span className={styles.lockIcon}>🔒</span>
                    <p className={styles.revealHint}>Try to solve it first</p>
                    <button className={styles.revealBtn} onClick={handleReveal}>
                      View Solution
                    </button>
                  </div>
                </div>
              )}

              <div
                className={styles.codeInner}
                style={{
                  filter: isRevealed ? 'none' : 'blur(8px)',
                  userSelect: isRevealed ? 'auto' : 'none',
                  pointerEvents: isRevealed ? 'auto' : 'none',
                  transition: 'filter 0.3s ease',
                }}
              >
                <SyntaxHighlighter
                  language={activeLangMeta.highlight}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    borderRadius: isRevealed ? '0 0 var(--radius-md) var(--radius-md)' : 'var(--radius-md)',
                    background: '#0d0d14',
                    fontSize: '0.875rem',
                    lineHeight: '1.7',
                  }}
                  showLineNumbers
                >
                  {currentCode}
                </SyntaxHighlighter>
              </div>
            </div>
          ) : (
            <div className={styles.noCode}>Solution not yet generated for {activeLangMeta.label}.</div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

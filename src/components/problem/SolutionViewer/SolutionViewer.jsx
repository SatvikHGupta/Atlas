'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getSolutions } from '../../../services/content/dataClient.js';
import { pickDefaultSolution, verificationLabel, isVariantMissing } from '../../../lib/solutions.utils.js';
import { sanitizeHtml } from '../../../lib/sanitizeHtml.js';
import styles from './SolutionViewer.module.css';

const LANGUAGES = [
  { key: 'javascript', label: 'JavaScript', checkPrefix: 'js' },
  { key: 'cpp',        label: 'C/C++' },       // no checks data exists for cpp/java (measured across a
  { key: 'java',       label: 'Java' },        // 400-problem sample) - checkPrefix stays undefined for
  { key: 'python',     label: 'Python', checkPrefix: 'py' }, // these, so they never show a signal either way
];
const VARIANTS = [{ key: 'algo', label: 'Algorithm' }, { key: 'optimal', label: 'Optimal' }];

/* PERFORMANCE FIX: this used to receive the FULL 4-language x 2-variant `solutions` object as a prop. Since this is a 'use client' component, Next.js has to serialize whatever it's given into the page's hydration payload - so all 8 pre-highlighted code blocks were shipped on every single problem page, even though only one is ever visible at first paint. Measuring actual built page sizes (not just "the build succeeded") found this was 98% of the heaviest pages' weight. Now this only ever receives `defaultSolution` (javascript/algo, tiny, server-rendered instantly - no fetch, no loading state, matches what the old version showed anyway since that was the default tab) plus `slug`. The other 7 blocks are fetched from a small pre-built static endpoint (see app/api/solutions/[slug]/route.js) exactly once, only if a visitor actually clicks a different language or variant tab - and cached after that first fetch, so switching tabs a second time is instant. */
export default function SolutionViewer({ slug, defaultSolution, checks }) {
  // BUG-111/C5: checks tells us which JS/Python combos are missing; C++/Java
  // have no check data so they're assumed available until proven otherwise.
  const getCheckStatus = (langKey, variantKey) => {
    const meta = LANGUAGES.find((l) => l.key === langKey);
    if (!meta?.checkPrefix || !checks) return undefined;
    return checks[`${meta.checkPrefix}_${variantKey}`];
  };

  const availableMap = useMemo(() => {
    const map = {};
    for (const lang of LANGUAGES) {
      for (const variant of VARIANTS) {
        map[`${lang.key}:${variant.key}`] = !isVariantMissing(getCheckStatus(lang.key, variant.key));
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checks]);

  const initialPick = useMemo(
    () => pickDefaultSolution(defaultSolution, availableMap) || { language: 'javascript', variant: 'algo' },
    [defaultSolution, availableMap]
  );

  const [activeLang, setActiveLang]       = useState(initialPick.language);
  const [activeVariant, setActiveVariant] = useState(initialPick.variant);
  const [copied, setCopied]               = useState(false);
  const [copyError, setCopyError]         = useState(false);
  // BUG-114: keyed by language:variant, not variant alone, so revealing one
  // solution never affects the reveal state of another language's same variant.
  const [revealed, setRevealed]           = useState({});
  const [fullSolutions, setFullSolutions] = useState(null); // filled in lazily, only if needed
  const [loading, setLoading]             = useState(false);
  const [loadError, setLoadError]         = useState(false);

  const isDefaultTab = activeLang === (defaultSolution?.language || 'javascript')
    && activeVariant === (defaultSolution?.variant || 'algo');

  const langData = fullSolutions?.[activeLang] || {};

  const currentCode = isDefaultTab
    ? defaultSolution?.code
    : (activeVariant === 'algo' ? langData.algoCode : langData.optimalCode);
  const currentCodeHtml = isDefaultTab
    ? defaultSolution?.codeHtml
    : (activeVariant === 'algo' ? langData.algoCodeHtml : langData.optimalCodeHtml);
  // SEC-07: never inject fetched HTML as-is, only the tags/attributes a syntax highlighter produces survive
  const safeCodeHtml = useMemo(() => sanitizeHtml(currentCodeHtml, 'code'), [currentCodeHtml]);
  const currentComplexity = isDefaultTab
    ? defaultSolution?.complexity
    : (activeVariant === 'algo' ? langData.algoComplexity : langData.optimalComplexity);

  const activeLangMeta = LANGUAGES.find((l) => l.key === activeLang) || LANGUAGES[0];
  const revealKey = `${activeLang}:${activeVariant}`;
  const isRevealed = !!revealed[revealKey];

  // true if EITHER variant for this language has a non-healthy check - used for the tab dot
  const langHasCaveat = (lang) => {
    if (!lang.checkPrefix || !checks) return false;
    return VARIANTS.some((v) => verificationLabel(checks[`${lang.checkPrefix}_${v.key}`]).tone !== 'ok');
  };

  const currentCheckStatus = getCheckStatus(activeLang, activeVariant);
  const currentVerification = verificationLabel(currentCheckStatus);

  const ensureFullSolutionsLoaded = async () => {
    if (fullSolutions || loading) return;
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getSolutions(slug);
      setFullSolutions(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const maybeLoad = (lang, variant) => {
    if (lang !== (defaultSolution?.language || 'javascript') || variant !== (defaultSolution?.variant || 'algo')) {
      ensureFullSolutionsLoaded();
    }
  };

  const selectLang = (key) => {
    // BUG-14: keep the current variant only if the new language has it, otherwise land on one that exists
    const keep = availableMap[`${key}:${activeVariant}`] !== false;
    const nextVariant = keep ? activeVariant : (VARIANTS.find((v) => availableMap[`${key}:${v.key}`] !== false)?.key ?? activeVariant);
    setActiveLang(key);
    setActiveVariant(nextVariant);
    setCopyError(false); // LINT-06: reset here instead of in an effect
    maybeLoad(key, nextVariant);
  };
  const selectVariant = (key) => {
    setActiveVariant(key);
    setCopyError(false);
    maybeLoad(activeLang, key);
  };

  const handleReveal = () => setRevealed((prev) => ({ ...prev, [revealKey]: true }));

  // BUG-115: never fail silently - fall back to a hidden textarea + execCommand,
  // and show an inline message if both paths fail.
  const handleCopy = async () => {
    if (!currentCode || !isRevealed) return;
    setCopyError(false);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentCode);
      } else {
        throw new Error('clipboard API unavailable');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = currentCode;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!ok) throw new Error('execCommand copy failed');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopyError(true);
        setTimeout(() => setCopyError(false), 4000);
      }
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.langTabs} role="tablist" aria-label="Solution language">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.key}
            type="button"
            role="tab"
            aria-selected={activeLang === lang.key}
            className={styles.langTab}
            data-active={activeLang === lang.key}
            onClick={() => selectLang(lang.key)}
          >
            {lang.label}
            {langHasCaveat(lang) && (
              <span className={styles.caveatDot} title="One or more variants for this language have a verification caveat" />
            )}
            {activeLang === lang.key && (
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
        <div className={styles.tabs} role="tablist" aria-label="Solution variant">
          {VARIANTS.map(({ key, label }) => {
            const status = getCheckStatus(activeLang, key);
            const disabled = isVariantMissing(status);
            const badge = verificationLabel(status);
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeVariant === key}
                className={styles.tab}
                data-active={activeVariant === key}
                disabled={disabled}
                title={disabled ? 'Not available for this language' : undefined}
                onClick={() => selectVariant(key)}
              >
                {label}
                {!disabled && (
                  <span className={styles.checkBadge} data-tone={badge.tone}>
                    <span aria-hidden="true">{badge.icon}</span>
                    <span className={styles.checkBadgeText}>{badge.text}</span>
                  </span>
                )}
                {activeVariant === key && (
                  <motion.span
                    layoutId="solution-tab-indicator"
                    className={styles.tabIndicator}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {currentComplexity && isRevealed && (
          <motion.div className={styles.complexity} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span className={styles.complexityBadge}>Time: <strong>{currentComplexity.time}</strong></span>
            <span className={styles.complexityBadge}>Space: <strong>{currentComplexity.space}</strong></span>
          </motion.div>
        )}

        <button
          type="button"
          className={styles.copyBtn}
          onClick={handleCopy}
          disabled={!isRevealed || !currentCode}
          title={isRevealed ? 'Copy code' : 'Reveal the solution first'}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {currentVerification.tone !== 'ok' && (
        <p className={styles.caveatNote}>
          <span aria-hidden="true">{currentVerification.icon}</span> {currentVerification.text}
        </p>
      )}
      {copyError && (
        <p className={styles.caveatNote} role="alert">
          Couldn&apos;t copy, select the text manually.
        </p>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeLang + activeVariant}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={styles.codeWrap}
        >
          {!isDefaultTab && loading ? (
            <div className={styles.noCode}>Loading {activeLangMeta.label}...</div>
          ) : !isDefaultTab && loadError ? (
            <div className={styles.noCode}>
              Couldn&apos;t load this solution. <button type="button" className={styles.copyBtn} onClick={ensureFullSolutionsLoaded}>Retry</button>
            </div>
          ) : currentCodeHtml ? (
            <div className={styles.codeContainer}>
              {!isRevealed && (
                <div className={styles.blurOverlay}>
                  <div className={styles.revealPrompt}>
                    <span className={styles.lockIcon}>🔒</span>
                    <p className={styles.revealHint}>Try to solve it first</p>
                    <button type="button" className={styles.revealBtn} onClick={handleReveal}>View Solution</button>
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
                // Pre-highlighted at build time (see file doc comment) and re-sanitized above (SEC-07).
                dangerouslySetInnerHTML={{ __html: safeCodeHtml }}
              />
            </div>
          ) : (
            <div className={styles.noCode}>Solution not yet generated for {activeLangMeta.label}.</div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

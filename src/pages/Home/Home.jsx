import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth.js';
import styles from './Home.module.css';

const STATS = [
  { value: '4,056',  label: 'DSA Problems' },
  { value: '10,518', label: 'CP Problems' },
  { value: '56',     label: 'Topic Notes' },
  { value: '0–7',   label: 'Roadmap Levels' },
];

const FEATURES = [
  {
    icon: '◈',
    tag: 'UNDERSTAND',
    title: 'AI Explanations',
    desc: 'Quick Look + Full Breakdown with dry-run tables and complexity analysis. Every DSA problem.',
  },
  {
    icon: '◧',
    tag: 'SOLVE',
    title: 'JS Solutions',
    desc: 'Algorithmic and optimal approaches. Pre-generated, verified, side-by-side.',
  },
  {
    icon: '◉',
    tag: 'PROGRESS',
    title: 'Atlas Roadmap',
    desc: 'Level 0 foundations through advanced. Unlock levels as you solve. No guessing what to do next.',
  },
  {
    icon: '◎',
    tag: 'TRACK',
    title: 'Progress Sync',
    desc: 'Solved, attempted, bookmarked - synced across devices via Google. Your grind, preserved.',
  },
];

const stagger = (i) => ({ delay: 0.08 + i * 0.07, duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] });

export default function Home() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const go = (path) => navigate(isAuthenticated ? path : '/login');

  return (
    <div className={styles.page}>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        {/* ambient glow - decorative */}
        <div className={styles.heroGlow} aria-hidden="true" />

        <motion.div
          className={styles.heroInner}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <div className={styles.terminalBar}>
            <span className={styles.termDot} data-col="red" />
            <span className={styles.termDot} data-col="yellow" />
            <span className={styles.termDot} data-col="green" />
            <span className={styles.termLabel}>atlas</span>
          </div>

          <div className={styles.terminalBody}>
            <div className={styles.termLine}>
              <span className={styles.termPrompt}>$</span>
              <span className={styles.termCmd}> atlas start</span>
            </div>
            <div className={styles.termOutput}>
              <span className={styles.termKey}>problems</span>
              <span className={styles.termSep}> → </span>
              <span className={styles.termVal}>14,574 indexed</span>
            </div>
            <div className={styles.termOutput}>
              <span className={styles.termKey}>roadmap </span>
              <span className={styles.termSep}> → </span>
              <span className={styles.termVal}>0–7 unlocked</span>
            </div>
            <div className={styles.termOutput}>
              <span className={styles.termKey}>status  </span>
              <span className={styles.termSep}> → </span>
              <span className={styles.termAccentVal}>ready</span>
              <span className={styles.cursor}>█</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className={styles.heroText}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.45, ease: 'easeOut' }}
        >
          <h1 className={styles.heroTitle}>
            Every problem.<br />
            <span className={styles.heroAccent}>Fully explained.</span>
          </h1>
          <p className={styles.heroSub}>
            LeetCode, Codeforces, CSES - deduplicated, AI-explained, tracked.
            One path from foundations to competitive.
          </p>
        </motion.div>

        <motion.div
          className={styles.heroCta}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.38 }}
        >
          <button className={styles.ctaPrimary} onClick={() => go('/problems')}>
            Browse Problems
            <span className={styles.ctaArrow}>→</span>
          </button>
          <button className={styles.ctaSecondary} onClick={() => go('/roadmap')}>
            Start Roadmap
          </button>
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <motion.div
        className={styles.statsGrid}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.5 }}
      >
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            className={styles.statCell}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.34 + i * 0.06, duration: 0.36 }}
          >
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* ── FEATURES ── */}
      <section className={styles.featuresSection}>
        <motion.p
          className={styles.sectionEyebrow}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          WHAT'S INSIDE
        </motion.p>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className={styles.featureCard}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(i)}
            >
              <div className={styles.featureTop}>
                <span className={styles.featureIcon}>{f.icon}</span>
                <span className={styles.featureTag}>{f.tag}</span>
              </div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <motion.section
        className={styles.footerStrip}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
      >
        <div className={styles.footerLineGroup}>
          <p className={styles.footerLine}>Built for developers who grind.</p>
          <p className={styles.footerNote}>Solutions are AI-generated via a custom pipeline- verify before you trust them blindly.</p>
        </div>
        <button className={styles.ctaPrimary} onClick={() => go('/problems')}>
          Get started
          <span className={styles.ctaArrow}>→</span>
        </button>
      </motion.section>

    </div>
  );
}

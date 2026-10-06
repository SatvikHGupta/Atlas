import { getDsaIndex, getCpIndex, getNotesIndex } from '../lib/server/content.server.js';
import { ROADMAP_LEVELS } from '../constants/roadmap.js';
import { buildRoutePath } from '../lib/routeMap.js';
import CtaButton from '../components/CtaButton.jsx';
import styles from './Home.module.css';
import { routes, canonicalAlternates } from '../lib/routeIdentity.js';

export const metadata = {
  alternates: canonicalAlternates(routes.home()),
  title: { absolute: 'Atlas' }, // home is just Atlas, no suffix
  description: 'LeetCode, Codeforces, and CSES - deduplicated, AI-explained, and tracked. One guided path from foundations to competitive programming.',
};

const FEATURES = [
  { icon: '◈', title: 'Two explanations per problem', desc: 'A quick read for the idea, a full breakdown with a dry-run table and complexity analysis for when that\'s not enough.' },
  { icon: '◧', title: 'Four languages, up to two approaches', desc: 'The brute-force and the optimal solution, written out in JavaScript, C++, Java, and Python - not just one.' },
  { icon: '◉', title: 'A route, not a pile', desc: 'A level opens once you have completed each of its topics.' },
  { icon: '◎', title: 'Nothing lost between devices', desc: 'Solved, attempted, bookmarked - all of it saved to your account, not your browser.' },
];

const ROUTE_WIDTH = 1200;
const ROUTE_HEIGHT = 300;

/* BUG FIX: STATS/the "14,574 indexed" terminal line/roadmap level range were hand-typed constants in the old Home.jsx - they'd silently go stale the moment the dataset changed size. Every number below is read from the actual built data (or the actual ROADMAP_LEVELS constant) at build time. DESIGN: the old hero was a fake terminal window - a recognizable dev-tool cliche that could belong to any coding product. Atlas is, literally, a book of maps - so the hero draws the roadmap as an actual route instead, built straight from ROADMAP_LEVELS (add a level there and the map grows with it, nothing here is a fixed illustration). */
export default function HomePage() {
  const dsaCount = getDsaIndex().length;
  const cpCount = getCpIndex().length;
  const notesIndex = getNotesIndex();
  const totalIndexed = dsaCount + cpCount;

  const STATS = [
    { value: dsaCount.toLocaleString(), label: 'DSA problems' },
    { value: cpCount.toLocaleString(), label: 'CP problems' },
    { value: String(notesIndex.total), label: 'topic notes' },
    { value: String(ROADMAP_LEVELS.length), label: 'roadmap levels' },
  ];

  const { d, points } = buildRoutePath(ROADMAP_LEVELS.length, ROUTE_WIDTH, ROUTE_HEIGHT);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />

        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>
            An atlas for the terrain<br />between you and an offer.
          </h1>
          <p className={styles.heroSub}>
            {totalIndexed.toLocaleString()} problems from LeetCode, Codeforces, and CSES, each one
            explained instead of just answered, laid out as one route from
            the first loop you write to the interview itself.
          </p>
          <div className={styles.heroCta}>
            <CtaButton to="/problems" className={styles.ctaPrimary}>Browse problems</CtaButton>
            <CtaButton to="/roadmap" className={styles.ctaSecondary}>Start the roadmap</CtaButton>
          </div>
        </div>

        <div className={styles.routeMap} role="img" aria-label={`The Atlas roadmap: ${ROADMAP_LEVELS.map((l) => l.title).join(', ')}`}>
          <svg viewBox={`0 0 ${ROUTE_WIDTH} ${ROUTE_HEIGHT}`} preserveAspectRatio="xMidYMid meet" className={styles.routeSvg}>
            <path d={d} className={styles.routeLine} fill="none" />
            {points.map((p, i) => {
              const level = ROADMAP_LEVELS[i];
              const labelAbove = p.y > ROUTE_HEIGHT / 2;
              return (
                <g key={level.level} className={styles.routeStop} style={{ '--stop-delay': `${0.5 + i * 0.09}s` }}>
                  <circle cx={p.x} cy={p.y} r={i === 0 ? 9 : 6} className={styles.routeDot} data-first={i === 0} />
                  <text
                    x={p.x}
                    y={labelAbove ? p.y - 20 : p.y + 32}
                    textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
                    className={styles.routeLabel}
                  >
                    {level.title}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      <div className={styles.statsGrid}>
        {STATS.map((s) => (
          <div key={s.label} className={styles.statCell}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      <section className={styles.featuresSection}>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.footerStrip}>
        <div className={styles.footerLineGroup}>
          <p className={styles.footerLine}>Built for developers who grind.</p>
          <p className={styles.footerNote}>Solutions are AI-generated via a custom pipeline - verify before you trust them blindly.</p>
        </div>
        <CtaButton to="/problems" className={styles.ctaPrimary}>Get started</CtaButton>
      </section>
    </div>
  );
}

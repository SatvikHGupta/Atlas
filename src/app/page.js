import { getDsaIndex, getCpIndex, getNotesIndex, getPatternIndex } from '../lib/server/content.server.js';
import { ROADMAP_LEVELS } from '../constants/roadmap.js';
import CtaButton from '../components/CtaButton.jsx';
import CodeDemo from '../components/home/CodeDemo.jsx';
import styles from './Home.module.css';
import { routes, canonicalAlternates } from '../lib/routeIdentity.js';

export const metadata = {
  alternates: canonicalAlternates(routes.home()),
  title: { absolute: 'Atlas' },
  description: 'LeetCode, Codeforces, and CSES - deduplicated, AI-explained, and tracked. One guided path from foundations to competitive programming.',
};

const fmt = (n) => Number(n).toLocaleString('en-US');

// zig-zag route: `n` squares along a wave, START at the first and OFFER at the last
function routeGeometry(n, w, h, amp) {
  const phase = (0.95 * 13) / (n - 1);
  const pts = Array.from({ length: n }, (_, i) => ({
    x: 30 + (i * (w - 60)) / (n - 1),
    y: h / 2 + amp * Math.sin(i * phase),
  }));
  return { pts, d: `M${pts.map((p) => `${p.x.toFixed(0)} ${p.y.toFixed(0)}`).join(' L')}` };
}

function RouteSvg({ n, w, h, amp, label, className }) {
  const { pts, d } = routeGeometry(n, w, h, amp);
  const last = pts.length - 1;
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ width: '100%', height: 'auto' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
      <path d={d} className={styles.routeLine} pathLength="1" />
      {pts.map((p, i) => (
        <rect
          key={i}
          x={p.x - 8}
          y={p.y - 8}
          width="16"
          height="16"
          className={i === 0 ? styles.sqStart : i === last ? styles.sqEnd : styles.sq}
        />
      ))}
      <text x={pts[0].x} y={pts[0].y + 34} textAnchor="start" className={styles.routeText}>START</text>
      <text x={pts[last].x} y={pts[last].y + 34} textAnchor="end" className={styles.routeText}>OFFER</text>
    </svg>
  );
}

export default function HomePage() {
  const dsaCount = getDsaIndex().length;
  const cpCount = getCpIndex().length;
  const notesTotal = getNotesIndex().total;
  const total = dsaCount + cpCount;
  const levelCount = ROADMAP_LEVELS.length;
  const patterns = getPatternIndex();

  // ticker: biggest patterns by problem count; stat cards: most asked by companies
  const ticker = [...patterns].sort((a, b) => b.totalProblemsInPool - a.totalProblemsInPool).slice(0, 10);
  const topAsked = [...patterns].sort((a, b) => b.companiesSeenIn - a.companiesSeenIn).slice(0, 3);
  const tickerItems = ticker.map((p) => `${p.pattern.toUpperCase()} ${fmt(p.totalProblemsInPool)}`);
  const routeLabel = `The Atlas roadmap: ${ROADMAP_LEVELS.map((l) => l.title).join(', ')}`;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>{`// ${levelCount} levels - ${fmt(total)} problems - 0 random picks`}</p>
        <h1 className={styles.title}>
          <span className={styles.outline}>The grind</span><br />
          has a<br />
          <span className={styles.accentWord}>map.</span>
        </h1>
        <p className={styles.sub}>
          {fmt(dsaCount)} DSA problems, every one explained twice. Plus {fmt(cpCount)} Codeforces problems
          and {fmt(notesTotal)} topic notes. No account needed to start.
        </p>
        <div className={styles.ctaRow}>
          <CtaButton to="/roadmap" className={styles.cta}>START THE ROUTE &rarr;</CtaButton>
          <CtaButton to="/problems" className={styles.ctaLink}>or browse all {fmt(total)}</CtaButton>
        </div>
      </section>

      <div className={styles.routeWrap}>
        <RouteSvg n={14} w={1168} h={200} amp={70} label={routeLabel} className={styles.routeDesk} />
        <RouteSvg n={7} w={350} h={130} amp={38} label={routeLabel} className={styles.routeMob} />
      </div>

      <div className={styles.ticker} aria-hidden="true">
        <div className={styles.tickerTrack}>
          {[0, 1].map((k) => (
            <span key={k} className={styles.tickerGroup}>
              {tickerItems.map((t) => <span key={t} className={styles.tickerItem}>{t} //</span>)}
            </span>
          ))}
        </div>
      </div>

      <section className={`${styles.section} ${styles.split}`}>
        <div className={styles.splitDemo}><CodeDemo /></div>
        <div>
          <p className={styles.label}>01 // READ</p>
          <h2 className={styles.h2}>Every problem. Explained twice.</h2>
          <p className={styles.body}>
            A quick read for the idea. A full breakdown with a dry-run table when it is not enough.
            Brute force and optimal, in JavaScript, C++, Java and Python.
          </p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.ruled}`}>
        <p className={styles.label}>02 // PATTERNS</p>
        <h2 className={styles.h2}>See what companies actually ask.</h2>
        <div className={styles.statGrid}>
          {topAsked.map((p) => (
            <div key={p.slug} className={styles.stat}>
              <div className={styles.statNum}>{p.companiesSeenIn}</div>
              <div className={styles.statLabel}>companies ask <span className={styles.accentText}>{p.pattern}</span></div>
              <div className={styles.statSub}>{fmt(p.totalProblemsInPool)} problems to practise</div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.ruled}`}>
        <p className={styles.label}>03 // ROUTE</p>
        <h2 className={styles.h2}>A route, not a pile.</h2>
        <div className={styles.levels}>
          {ROADMAP_LEVELS.slice(0, 3).map((l, i) => (
            <div key={l.level} className={`${styles.level} ${i === 2 ? styles.levelLocked : ''}`}>
              <span className={styles.levelNum}>{String(l.level).padStart(2, '0')}</span>
              <div>
                <p className={styles.levelTag}>{i === 2 ? `LOCKED // finish every Level ${ROADMAP_LEVELS[i - 1].level} topic to open` : `LEVEL ${l.level} // OPEN`}</p>
                <p className={styles.levelTitle}>{l.title}</p>
              </div>
              <span className={styles.levelCount}>{l.topicSlugs.length} topics</span>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.trust}>
        <b>Solutions are AI-generated</b> via a custom pipeline - verify before you trust them blindly.
      </div>

      <section className={styles.final}>
        <p className={styles.finalTitle}>Pick a problem.<br />Start the route.</p>
        <CtaButton to="/roadmap" className={styles.finalCta}>START THE ROUTE &rarr;</CtaButton>
      </section>
    </div>
  );
}

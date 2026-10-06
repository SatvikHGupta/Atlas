import { getPreviewVars } from '../../../theme/theme-preview.js';
import styles from './PreviewPanel.module.css';

// A miniature app painted with a DRAFT theme (mode + primary + secondary). The theme's variables are set inline on this
// element only, so nothing outside the panel changes until the visitor presses Apply. Everything inside uses the same
// token names as the real app (var(--accent), var(--accent-gradient)...), so what shows here is what Apply gives.
// Decorative: hidden from assistive tech; the Appearance page announces the draft in text instead.
const HEAT = [0, 25, 0, 55, 80, 35, 0, 60, 90, 20, 0, 45, 70, 30];

export default function PreviewPanel({ mode, accent, secondary }) {
  return (
    <div className={styles.panel} style={getPreviewVars(mode, accent, secondary)} aria-hidden="true">
      <div className={styles.nav}>
        <span className={styles.logo}>◈</span>
        <span className={styles.brand}>Atlas</span>
        <span className={`${styles.tab} ${styles.tabOn}`}>Dashboard</span>
        <span className={styles.tab}>Patterns</span>
        <span className={styles.tab}>Notes</span>
      </div>

      <div className={styles.body}>
        <div className={styles.row}>
          <b className={styles.title}>142 solved</b>
          <span className={styles.chip}>Solved</span>
          <span className={styles.link}>view solution</span>
        </div>
        <div className={styles.bar}><i /></div>
        <div className={styles.heat}>
          {HEAT.map((level, i) => <i key={i} style={{ '--level': `${level}%` }} />)}
        </div>
        <div className={styles.code}>
          <span className={styles.codeKey}>const</span> total <span className={styles.codeMuted}>=</span> solved<span className={styles.codeMuted}>.</span>length
        </div>
        <div className={styles.row}>
          <span className={styles.primary}>Solve next</span>
          <span className={styles.ghost}>Skip</span>
        </div>
      </div>
    </div>
  );
}

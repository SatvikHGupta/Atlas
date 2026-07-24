import { useEffect, useRef } from 'react';
import styles from './ProgressRing.module.css';

const RADIUS      = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ProgressRing({ value = 0, total = 100, size = 100, label }) {
  const fillRef = useRef(null);
  const pct        = total > 0 ? Math.min(value / total, 1) : 0;
  const targetOffset = CIRCUMFERENCE * (1 - pct);
  const displayPct   = Math.round(pct * 100);

  useEffect(() => {
    if (!fillRef.current) return;
    
    
    fillRef.current.style.transition = 'none';
    fillRef.current.style.strokeDashoffset = CIRCUMFERENCE;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (fillRef.current) {
          fillRef.current.style.transition = 'stroke-dashoffset 1s ease';
          fillRef.current.style.strokeDashoffset = targetOffset;
        }
      });
    });
  }, [targetOffset]);

  return (
    <div className={styles.wrapper} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className={styles.svg}>
        <circle cx="50" cy="50" r={RADIUS} className={styles.track} />
        <circle
          ref={fillRef}
          cx="50" cy="50" r={RADIUS}
          className={styles.fill}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
        />
      </svg>
      <div className={styles.center}>
        <span className={styles.pct}>{displayPct}%</span>
        {label && <span className={styles.label}>{label}</span>}
      </div>
    </div>
  );
}

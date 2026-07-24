import { useEffect, useRef, useState } from 'react';
import styles from './StatsSummary.module.css';

function AnimatedNumber({ target }) {
  const [display, setDisplay] = useState(0);
  const prevTarget = useRef(null);

  useEffect(() => {
    
    if (prevTarget.current === target) return;
    prevTarget.current = target;

    let start    = 0;
    const duration  = 900;
    const step      = 16;
    const increment = target / (duration / step);

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setDisplay(target);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, step);

    return () => clearInterval(timer);
  }, [target]);

  return <span>{display.toLocaleString()}</span>;
}

export default function StatsSummary({ stats }) {
  return (
    <div className={styles.grid}>
      {stats.map((s) => (
        <div key={s.label} className={styles.card}>
          <div className={styles.value} style={{ color: s.color || 'var(--accent)' }}>
            <AnimatedNumber target={s.value} />
          </div>
          <div className={styles.label}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

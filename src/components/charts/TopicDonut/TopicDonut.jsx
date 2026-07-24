import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js';
import '../../../services/chartjs.setup.js';
import styles from './TopicDonut.module.css';

const PALETTE = [
  '#6c63ff', '#22c55e', '#f97316', '#06b6d4',
  '#a855f7', '#facc15', '#ec4899', '#14b8a6',
];

// totalSolved passed from parent (from progressList) - more accurate than summing top_topics
// which only covers the backend's top N topics, not all solved problems
export default function TopicDonut({ data = [], totalSolved }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map((d) => d.name),
        datasets: [{
          data: data.map((d) => d.value),
          backgroundColor: PALETTE.map((c) => c + 'cc'), 
          borderColor: PALETTE,
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 6,
        }],
      },
      options: {
        cutout: '68%',
        animation: { animateRotate: true, duration: 900, easing: 'easeInOutQuart' },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed} solved`,
            },
          },
        },
      },
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  if (!data.length) {
    return <div className={styles.empty}>Solve some problems to see your topic breakdown.</div>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.canvasWrap}>
        <canvas ref={canvasRef} />
        {}
        <div className={styles.center}>
          <span className={styles.total}>{totalSolved ?? data.reduce((s, d) => s + d.value, 0)}</span>
          <span className={styles.totalLabel}>solved</span>
        </div>
      </div>

      {}
      <ul className={styles.legend}>
        {data.slice(0, 6).map((d, i) => (
          <li key={d.name} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className={styles.legendName}>{d.name}</span>
            <span className={styles.legendVal}>{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

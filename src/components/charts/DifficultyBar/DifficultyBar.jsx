import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js';
import '../../../services/chartjs.setup.js';
import styles from './DifficultyBar.module.css';

export default function DifficultyBar({ byDifficulty = null }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const tiers  = byDifficulty || { Easy: 0, Medium: 0, Hard: 0, Expert: 0 };
    const labels = Object.keys(tiers);
    const values = Object.values(tiers);
    const colors = [
      'rgba(134, 239, 172, 0.85)',
      'rgba(250, 204, 21,  0.85)',
      'rgba(249, 115, 22,  0.85)',
      'rgba(239, 68,  68,  0.85)',
    ];
    const borders = [
      'rgba(134, 239, 172, 1)',
      'rgba(250, 204, 21,  1)',
      'rgba(249, 115, 22,  1)',
      'rgba(239, 68,  68,  1)',
    ];

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        // vertical bars: difficulty on X, count on Y
        indexAxis: 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => ` ${ctx.raw} solved` },
          },
        },
        scales: {
          x: {
            ticks: { color: '#9090a8', font: { size: 12 } },
            grid:  { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#9090a8',
              stepSize: 1,
              // only show whole numbers
              callback: (v) => Number.isInteger(v) ? v : null,
            },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
        },
      },
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [byDifficulty]);

  return <div className={styles.wrapper}><canvas ref={canvasRef} /></div>;
}

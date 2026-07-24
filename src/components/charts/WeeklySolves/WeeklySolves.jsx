import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js';
import '../../../services/chartjs.setup.js';
import styles from './WeeklySolves.module.css';

export default function WeeklySolves({ data = [] }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    if (chartRef.current) chartRef.current.destroy();

    
    const labels = data.map((_, i) => {
      const weeksAgo = data.length - 1 - i;
      return weeksAgo === 0 ? 'This week' : `${weeksAgo}w ago`;
    });

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: '#6c63ff',
          backgroundColor: 'rgba(108, 99, 255, 0.12)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#6c63ff',
          fill: true,
          tension: 0.35,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.raw} solved`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: '#9090a8',
              font: { size: 10 },
              maxTicksLimit: 6,
            },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#9090a8',
              stepSize: 1,
              font: { size: 10 },
            },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
        },
      },
    });

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  return <div className={styles.wrapper}><canvas ref={canvasRef} /></div>;
}

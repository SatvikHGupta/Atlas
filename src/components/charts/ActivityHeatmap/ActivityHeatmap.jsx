import { useEffect, useRef } from 'react';
import styles from './ActivityHeatmap.module.css';

const WEEKS = 26;
const DAYS_PER_COL = 7;
const CELL = 13;
const GAP = 3;
const STEP = CELL + GAP;

const HEAT_COLORS = [
  '#1c1c28',
  '#3d3580',
  '#5547cc',
  '#6c63ff',
  '#a78bfa',
];

const getColor = (count) => {
  if (count === 0) return HEAT_COLORS[0];
  if (count === 1) return HEAT_COLORS[1];
  if (count === 2) return HEAT_COLORS[2];
  if (count === 3) return HEAT_COLORS[3];
  return HEAT_COLORS[4];
};

const buildDayMap = (progressList) => {
  const map = {};
  for (const p of progressList) {
    if (p.status !== 'solved' || !p.first_solved_at) continue;
    const day = p.first_solved_at.slice(0, 10);
    map[day] = (map[day] || 0) + 1;
  }
  return map;
};

const buildGrid = (dayMap) => {
  const today = new Date();
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - WEEKS * 7);

  const cells = [];
  for (let d = new Date(startDay); d <= today; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, count: dayMap[key] || 0 });
  }
  return cells;
};

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

export default function ActivityHeatmap({ progressList = [] }) {
  const canvasRef = useRef(null);
  const cellsRef  = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dayMap = buildDayMap(progressList);
    const cells  = buildGrid(dayMap);
    cellsRef.current = cells;

    const cols = Math.ceil(cells.length / DAYS_PER_COL);
    const W = cols * STEP + 40;
    const H = DAYS_PER_COL * STEP + 28;

    canvas.width = W;
    canvas.height = H;
    /* let CSS handle display size on desktop; on mobile scrollWrap handles overflow */
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#5a5a72';
    ctx.textAlign = 'right';
    DAY_LABELS.forEach((label, i) => {
      if (label) ctx.fillText(label, 36, 28 + i * STEP + CELL - 2);
    });

    cells.forEach(({ date, count }, idx) => {
      const col = Math.floor(idx / DAYS_PER_COL);
      const row = idx % DAYS_PER_COL;
      const x = 40 + col * STEP;
      const y = 22 + row * STEP;

      ctx.fillStyle = getColor(count);
      ctx.beginPath();
      ctx.roundRect(x, y, CELL, CELL, 3);
      ctx.fill();
    });

    ctx.textAlign = 'left';
    ctx.fillStyle = '#5a5a72';
    let lastMonth = -1;
    cells.forEach(({ date }, idx) => {
      const col = Math.floor(idx / DAYS_PER_COL);
      const month = parseInt(date.slice(5, 7), 10) - 1;
      if (month !== lastMonth) {
        ctx.fillText(MONTH_LABELS[month], 40 + col * STEP, 14);
        lastMonth = month;
      }
    });
  }, [progressList]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const col = Math.floor((mx - 40) / STEP);
    const row = Math.floor((my - 22) / STEP);
    if (col < 0 || row < 0 || row >= DAYS_PER_COL) return;

    const cell = cellsRef.current[col * DAYS_PER_COL + row];
    if (cell) {
      canvas.title = cell.count
        ? `${cell.date}: ${cell.count} solved`
        : `${cell.date}: no activity`;
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* scrollWrap enables horizontal scroll on mobile */}
      <div className={styles.scrollWrap}>
        <canvas ref={canvasRef} className={styles.canvas} onMouseMove={handleMouseMove} />
      </div>
      <div className={styles.legend}>
        <span className={styles.legendLabel}>Less</span>
        {HEAT_COLORS.map((c) => (
          <span key={c} className={styles.legendCell} style={{ background: c }} />
        ))}
        <span className={styles.legendLabel}>More</span>
      </div>
    </div>
  );
}

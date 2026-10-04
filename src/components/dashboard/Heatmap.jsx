'use client';

// Solve calendar: one square per day, columns are weeks. It fills the width of its card (CSS grid, square cells) instead of
// scrolling sideways, and it opens on 6 months on a phone, 12 on a desktop. Author: Satvik Hemant Gupta
//
// Month labels come from lib/dashboardData.js monthMarkers (never two labels closer than 3 columns, never the same month twice).
// The grid is decorative for screen readers (role=img with a summary); the same activity is available as the weekly chart + table.
import { useMemo, useState } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { HEATMAP_RANGES, sliceWeeks, monthMarkers, heatLevel } from '../../lib/dashboardData.js';
import { formatDayKey } from './charts/chartConfigs.js';
import styles from '../../app/dashboard/Dashboard.module.css';

const RANGE_LABEL = { '3m': '3 months', '6m': '6 months', '12m': '12 months' };
const DAY_LABEL = { 1: 'Mon', 3: 'Wed', 5: 'Fri' }; // rows: Sun=0 ... Sat=6

export default function Heatmap({ weeks }) {
  const narrow = useMediaQuery('(max-width: 640px)');
  const [picked, setPicked] = useState(null);
  const range = picked ?? (narrow ? '6m' : '12m');

  const shown = useMemo(() => sliceWeeks(weeks, range), [weeks, range]);
  const markers = useMemo(() => monthMarkers(shown), [shown]);
  const { max, total } = useMemo(() => {
    const days = shown.flat().filter((d) => !d.future);
    return { max: Math.max(1, ...days.map((d) => d.count)), total: days.reduce((n, d) => n + d.count, 0) };
  }, [shown]);

  return (
    <div className={styles.heatmap}>
      <div className={styles.heatHead}>
        <span className={styles.heatTotal}>{total} {total === 1 ? 'solve' : 'solves'} in the last {RANGE_LABEL[range]}</span>
        <div className={styles.rangeGroup} role="group" aria-label="Calendar range">
          {Object.keys(HEATMAP_RANGES).map((key) => (
            <button key={key} type="button" className={styles.rangeBtn} aria-pressed={range === key} onClick={() => setPicked(key)}>
              {key.replace('m', ' mo')}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.heatScroll}>
        <div
          className={styles.heatGrid}
          style={{ '--cols': shown.length }}
          role="img"
          aria-label={`Solve calendar for the last ${RANGE_LABEL[range]}: ${total} ${total === 1 ? 'solve' : 'solves'}`}
        >
          {markers.map((m) => (
            <span key={m.col} className={styles.heatMonth} style={{ gridColumn: `${m.col + 2} / span ${Math.min(3, shown.length - m.col)}`, gridRow: 1 }}>{m.label}</span>
          ))}
          {Object.entries(DAY_LABEL).map(([row, text]) => (
            <span key={row} className={styles.heatDay} style={{ gridColumn: 1, gridRow: Number(row) + 2 }}>{text}</span>
          ))}
          {shown.map((week, w) => week.map((day, d) => (
            <span
              key={day.date}
              className={styles.heatCell}
              data-level={day.future ? undefined : heatLevel(day.count, max)}
              data-future={day.future || undefined}
              style={{ gridColumn: w + 2, gridRow: d + 2 }}
              title={day.future ? undefined : `${day.count === 0 ? 'No solves' : `${day.count} ${day.count === 1 ? 'solve' : 'solves'}`} - ${formatDayKey(day.date)}`}
            />
          )))}
        </div>
      </div>

      <div className={styles.heatLegend} aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => <span key={l} className={styles.heatCell} data-level={l} />)}
        <span>More</span>
      </div>
    </div>
  );
}

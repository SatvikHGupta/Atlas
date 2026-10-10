'use client';

// One Chart.js chart in a fixed-height box. Author: Satvik Hemant Gupta
import { useEffect, useMemo, useRef, useState } from 'react';
import { createChartController } from './chartController.js';
import { loadChart } from './chartSetup.js';
import { useChartTheme } from './useChartTheme.js';
import styles from '../../../app/dashboard/Dashboard.module.css';

const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function ChartTable({ table, visible }) {
  if (!table) return null;
  return (
    <table className={visible ? styles.dataTable : styles.srOnly}>
      <caption>{table.caption}</caption>
      <thead><tr>{table.headers.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>
        {table.rows.map((row, i) => (
          <tr key={i}>{row.map((cell, j) => (j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>))}</tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ChartCanvas({ builder, data, label, height = 220, table }) {
  const theme = useChartTheme();
  const config = useMemo(() => (theme ? builder(theme, data) : null), [theme, builder, data]);

  const canvasRef = useRef(null);
  const controllerRef = useRef(null);
  const configRef = useRef(config);
  const [failed, setFailed] = useState(false);
  const hasConfig = config !== null;

  useEffect(() => {
    configRef.current = config;
    if (config) controllerRef.current?.update(config);
  }, [config]);

  useEffect(() => {
    if (!hasConfig || failed) return undefined;
    const controller = createChartController({ loadChart, onError: () => setFailed(true), prefersReducedMotion });
    controllerRef.current = controller;
    controller.mount(canvasRef.current, configRef.current);
    return () => { controller.destroy(); controllerRef.current = null; };
  }, [hasConfig, failed]);

  return (
    <div className={styles.chartBox} style={{ height: failed ? 'auto' : height }}>
      {!failed && hasConfig && <canvas ref={canvasRef} role="img" aria-label={label} />}
      <ChartTable table={table} visible={failed} />
      {failed && <p className={styles.chartFallback}>The chart could not be loaded, so the numbers are listed instead.</p>}
    </div>
  );
}

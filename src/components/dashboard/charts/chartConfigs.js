// One function per dashboard chart. Author: Satvik Hemant Gupta

import { withAlpha, softColor } from './chartTheme.js';

const ANIMATION = { duration: 650, easing: 'easeOutQuart' };

// "2026-09-28" -> "Mon, Sep 28"
export function formatDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const truncate = (text, max = 18) => (String(text).length > max ? `${String(text).slice(0, max - 3)}...` : text);

function tooltip(theme, extra = {}) {
  return {
    backgroundColor: theme.elevated,
    titleColor: theme.text,
    bodyColor: theme.textSecondary,
    footerColor: theme.muted,
    borderColor: theme.border,
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
    boxPadding: 4,
    displayColors: false,
    ...extra,
  };
}

function base(theme, extraPlugins = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: ANIMATION,
    color: theme.muted,
    font: { family: theme.font, size: 12 },
    plugins: { legend: { display: false }, tooltip: tooltip(theme), ...extraPlugins },
  };
}

const gridY = (theme) => ({
  beginAtZero: true,
  grace: '10%',
  border: { display: false },
  grid: { color: theme.border },
  ticks: { color: theme.muted, precision: 0, maxTicksLimit: 5 },
});

const legendBottom = (theme) => ({
  display: true,
  position: 'bottom',
  labels: { color: theme.muted, usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 9, boxHeight: 9, padding: 14 },
});

// 12 weekly bars; the current (unfinished) week is solid, the rest are softer
export function weeklyBarsConfig(theme, { labels, counts, currentIndex }) {
  const options = base(theme);
  options.scales = {
    x: { grid: { display: false }, border: { display: false }, ticks: { color: theme.muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } },
    y: gridY(theme),
  };
  options.plugins.tooltip = tooltip(theme, {
    callbacks: {
      title: (items) => `Week of ${items[0].label}`,
      label: (item) => plural(item.parsed.y, 'solve', 'solves'),
    },
  });
  return {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Solved',
        data: counts,
        backgroundColor: counts.map((_, i) => (i === currentIndex ? theme.accent : withAlpha(theme.accentRgb, 0.4))),
        hoverBackgroundColor: theme.accent,
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 30,
      }],
    },
    options,
  };
}

// The tiny cumulative-solves line inside the "Solved" KPI
export function sparklineConfig(theme, { values }) {
  const options = base(theme);
  options.events = [];
  options.layout = { padding: { top: 4, bottom: 2 } };
  options.scales = { x: { display: false }, y: { display: false, grace: '25%' } };
  options.plugins.tooltip = { enabled: false };
  return {
    type: 'line',
    data: {
      labels: values.map((_, i) => i + 1),
      datasets: [{
        data: values,
        borderColor: theme.accent,
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 0,
        fill: true,
        backgroundColor: withAlpha(theme.accentRgb, 0.14),
      }],
    },
    options,
  };
}

// Sun-Sat bars inside the "This week" KPI
export function weekDaysConfig(theme, { days }) {
  const options = base(theme);
  options.layout = { padding: { top: 2 } };
  options.scales = {
    x: { grid: { display: false }, border: { display: false }, ticks: { color: theme.muted, font: { size: 10 } } },
    y: { display: false, beginAtZero: true, suggestedMax: 3 },
  };
  options.plugins.tooltip = tooltip(theme, {
    callbacks: {
      title: (items) => formatDayKey(days[items[0].dataIndex].date),
      label: (item) => (days[item.dataIndex].future ? 'upcoming' : plural(item.parsed.y, 'solve', 'solves')),
    },
  });
  return {
    type: 'bar',
    data: {
      labels: days.map((d) => d.label),
      datasets: [{
        data: days.map((d) => d.count),
        backgroundColor: days.map((d) => (d.future ? 'transparent' : d.isToday && d.count > 0 ? theme.accent : d.count > 0 ? withAlpha(theme.accentRgb, 0.55) : theme.border)),
        borderRadius: 4,
        borderSkipped: false,
        minBarLength: 3,
        maxBarThickness: 16,
      }],
    },
    options,
  };
}

const centerText = {
  id: 'centerText',
  afterDatasetsDraw(chart, _args, opts) {
    const { ctx, chartArea } = chart;
    if (!chartArea || !opts) return;
    const x = (chartArea.left + chartArea.right) / 2;
    const y = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = opts.color;
    ctx.font = `700 ${opts.size}px ${opts.font}`;
    ctx.fillText(String(opts.value), x, y - 7);
    ctx.fillStyle = opts.subColor;
    ctx.font = `500 12px ${opts.font}`;
    ctx.fillText(opts.label, x, y + 15);
    ctx.restore();
  },
};

export function difficultyDoughnutConfig(theme, { rows }) {
  const solved = rows.reduce((n, r) => n + r.solved, 0);
  const empty = solved === 0;
  const options = base(theme, {
    centerText: { value: solved, label: 'solved', color: theme.text, subColor: theme.muted, font: theme.font, size: 28 },
  });
  options.cutout = '74%';
  options.plugins.tooltip = empty
    ? { enabled: false }
    : tooltip(theme, { callbacks: { label: (item) => `${rows[item.dataIndex].name}: ${rows[item.dataIndex].solved} of ${rows[item.dataIndex].total}` } });
  return {
    type: 'doughnut',
    data: {
      labels: rows.map((r) => r.name),
      datasets: [{
        data: empty ? rows.map(() => 1) : rows.map((r) => r.solved),
        backgroundColor: empty ? rows.map(() => theme.border) : rows.map((r) => theme.difficulty[r.name]),
        borderWidth: 0,
        spacing: empty ? 0 : 3,
        borderRadius: empty ? 0 : 6,
        hoverOffset: empty ? 0 : 4,
      }],
    },
    options,
    plugins: [centerText],
  };
}

// Horizontal stacked bars: solved + tried per topic, most active on top
export function topicBarConfig(theme, { rows }) {
  const options = base(theme);
  options.indexAxis = 'y';
  options.plugins.legend = legendBottom(theme);
  options.scales = {
    x: { stacked: true, beginAtZero: true, border: { display: false }, grid: { color: theme.border }, ticks: { color: theme.muted, precision: 0, maxTicksLimit: 5 } },
    y: {
      stacked: true,
      border: { display: false },
      grid: { display: false },
      ticks: { color: theme.textSecondary, callback(value) { return truncate(this.getLabelForValue(value)); } },
    },
  };
  options.plugins.tooltip = tooltip(theme, {
    displayColors: true,
    callbacks: {
      title: (items) => rows[items[0].dataIndex].name,
      label: (item) => `${item.dataset.label}: ${item.parsed.x}`,
      footer: (items) => {
        const r = rows[items[0].dataIndex];
        return `of ${r.total} in this topic (${Math.round(((r.solved) / r.total) * 100)}% solved)`;
      },
    },
  });
  return {
    type: 'bar',
    data: {
      labels: rows.map((r) => r.name),
      datasets: [
        { label: 'Solved', data: rows.map((r) => r.solved), backgroundColor: theme.accent, borderRadius: 4, borderSkipped: false, maxBarThickness: 18 },
        { label: 'Tried', data: rows.map((r) => r.attempted), backgroundColor: softColor(theme.attempted, 0.85), borderRadius: 4, borderSkipped: false, maxBarThickness: 18 },
      ],
    },
    options,
  };
}

export function topicRadarConfig(theme, { rows }) {
  const options = base(theme);
  options.plugins.legend = legendBottom(theme);
  options.scales = {
    r: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: theme.border },
      angleLines: { color: theme.border },
      ticks: { precision: 0, maxTicksLimit: 4, color: theme.muted, showLabelBackdrop: false, backdropColor: 'transparent' },
      pointLabels: { color: theme.textSecondary, font: { size: 11 }, callback: (label) => truncate(label, 14) },
    },
  };
  options.plugins.tooltip = tooltip(theme, {
    displayColors: true,
    callbacks: {
      title: (items) => rows[items[0].dataIndex].name,
      label: (item) => `${item.dataset.label}: ${item.parsed.r}`,
      footer: (items) => `of ${rows[items[0].dataIndex].total} in this topic`,
    },
  });
  return {
    type: 'radar',
    data: {
      labels: rows.map((r) => r.name),
      datasets: [
        {
          label: 'Solved',
          data: rows.map((r) => r.solved),
          borderColor: theme.accent,
          backgroundColor: withAlpha(theme.accentRgb, 0.22),
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: theme.accent,
        },
        {
          label: 'Solved + tried',
          data: rows.map((r) => r.solved + r.attempted),
          borderColor: theme.attempted,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
        },
      ],
    },
    options,
  };
}

export function cpBandsConfig(theme, { rows }) {
  const options = base(theme);
  options.scales = {
    x: { grid: { display: false }, border: { display: false }, ticks: { color: theme.muted, font: { size: 10 }, maxRotation: 50, autoSkip: false } },
    y: gridY(theme),
  };
  options.plugins.tooltip = tooltip(theme, {
    callbacks: { title: (items) => rows[items[0].dataIndex].label, label: (item) => `${plural(item.parsed.y, 'problem', 'problems')} solved` },
  });
  return {
    type: 'bar',
    data: {
      labels: rows.map((r) => r.label),
      datasets: [{ label: 'Solved', data: rows.map((r) => r.count), backgroundColor: rows.map((r) => r.color), borderRadius: 6, borderSkipped: false, maxBarThickness: 34 }],
    },
    options,
  };
}

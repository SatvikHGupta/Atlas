// Everything the dashboard shows, prepared as plain data. Author: Satvik Hemant Gupta

import { getDifficultyBucket } from './difficulty.utils.js';
import { addDays, todayKey, localDateKey } from './dates.js';
import { monthNameOfKey, calcWeeklySolves } from './stats.js';
import { formatLockHint } from './roadmap.js';
import { RATING_BANDS } from './codeforces.utils.js';
import { getDisplayRating } from './cpRating.js';

export const HEATMAP_RANGES = { '3m': 13, '6m': 26, '12m': 53 };
export const DIFFICULTY_ORDER = ['Easy', 'Medium', 'Hard', 'Expert'];

const bucketOf = (score) => getDifficultyBucket(score) ?? 'Easy';
const dsaRows = (allProblems) => allProblems.filter((p) => p.should_generate !== false);
const solvedAt = (p) => p.first_solved_at || p.updated_at || null;

// One line under the greeting: what matters most right now
export function headerLine({ isNew, currentStreak, solvedToday, todayCount }) {
  if (isNew) return "Let's get your first solve on the board.";
  if (solvedToday) return todayCount === 1 ? "You've solved 1 problem today. Nice." : `You've solved ${todayCount} problems today. Nice.`;
  if (currentStreak > 0) return `Solve one today to keep your ${currentStreak}-day streak alive.`;
  return 'Pick a problem and start a new streak.';
}

// Share of the catalogue solved
export function percentOfCatalogue(solved, total) {
  if (!total || !solved) return '0%';
  const v = (solved / total) * 100;
  if (v < 0.1) return '<0.1%';
  const oneDecimal = Math.round(v * 10) / 10;
  if (oneDecimal >= 10) return `${Math.round(v)}%`;
  return Number.isInteger(oneDecimal) ? `${oneDecimal}%` : `${oneDecimal.toFixed(1)}%`;
}

// Solves per local day counting DSA problems only
export function dsaSolvesByDate(progressList, allProblems) {
  const ids = new Set(dsaRows(allProblems).map((p) => p.canonical_id));
  const out = {};
  for (const p of progressList) {
    if (p.status !== 'solved' || !p.first_solved_at || !ids.has(p.canonical_id)) continue;
    const day = localDateKey(p.first_solved_at);
    if (day) out[day] = (out[day] || 0) + 1;
  }
  return out;
}

// Last 7 local days
export function recentDaysStrip(solvesByDate, now = new Date(), days = 7) {
  const today = todayKey(now);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - (days - 1));
    return { date, solved: (solvesByDate[date] || 0) > 0, isToday: date === today };
  });
}

// This Sunday-Saturday week, one entry per day
export function thisWeekDays(solvesByDate, now = new Date()) {
  const today = todayKey(now);
  const start = addDays(today, -now.getDay());
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return labels.map((label, i) => {
    const date = addDays(start, i);
    const future = date > today;
    return { label, date, count: future ? 0 : solvesByDate[date] || 0, future, isToday: date === today };
  });
}

// Solves this week vs the previous full week
export function weekComparison(solvesByDate, now = new Date()) {
  const days = thisWeekDays(solvesByDate, now);
  const thisWeek = days.reduce((n, d) => n + d.count, 0);
  const lastStart = addDays(days[0].date, -7);
  let lastWeek = 0;
  for (let i = 0; i < 7; i++) lastWeek += solvesByDate[addDays(lastStart, i)] || 0;
  const delta = thisWeek - lastWeek;
  return { thisWeek, lastWeek, delta, days };
}

// "+2 vs last week" / "same as last week" / "3 fewer than last week"
export function describeWeekDelta({ thisWeek, lastWeek, delta }) {
  if (thisWeek === 0 && lastWeek === 0) return 'no solves yet this week';
  if (delta === 0) return 'same as last week';
  if (delta > 0) return `+${delta} vs last week`;
  return `${Math.abs(delta)} fewer than last week`;
}

// Weekly solve counts for the last `weeks` weeks
export function weeklySeries(solvesByDate, weeks = 12, now = new Date()) {
  const counts = calcWeeklySolves(solvesByDate, weeks, now);
  const today = todayKey(now);
  const labels = counts.map((_, i) => {
    const start = addDays(today, -((weeks - 1 - i) * 7) - now.getDay());
    return `${monthNameOfKey(start)} ${Number(start.slice(8, 10))}`;
  });
  return { labels, counts, currentIndex: weeks - 1 };
}

// Running total of solved problems at the end of each of those weeks
export function cumulativeSeries(weeklyCounts, totalSolved) {
  const inWindow = weeklyCounts.reduce((n, c) => n + c, 0);
  let running = Math.max(0, totalSolved - inWindow);
  return weeklyCounts.map((c) => (running += c));
}

// Month labels for the heatmap header: {col, label}
export function monthMarkers(weeks, minGap = 3) {
  const out = [];
  weeks.forEach((week, col) => {
    const prev = weeks[col - 1];
    const changed = !prev || week[0].date.slice(5, 7) !== prev[0].date.slice(5, 7);
    if (!changed) return;
    if (out.length && col - out[out.length - 1].col < minGap) return;
    out.push({ col, label: monthNameOfKey(week[0].date) });
  });
  if (out.length > 1 && out[0].label === out[out.length - 1].label) out.shift();
  return out;
}

// 0 = no solves, 1-4 = quartiles of the busiest day shown
export function heatLevel(count, max) {
  if (!count) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export const sliceWeeks = (weeks, range) => weeks.slice(-(HEATMAP_RANGES[range] ?? HEATMAP_RANGES['12m']));

// Per difficulty bucket: how many exist, how many solved, how many attempted
export function difficultyRows(allProblems, progressList) {
  const status = new Map(progressList.map((p) => [p.canonical_id, p.status]));
  const rows = Object.fromEntries(DIFFICULTY_ORDER.map((name) => [name, { name, total: 0, solved: 0, attempted: 0 }]));
  for (const p of dsaRows(allProblems)) {
    const row = rows[bucketOf(p.difficulty)];
    row.total++;
    const s = status.get(p.canonical_id);
    if (s === 'solved') row.solved++;
    else if (s === 'attempted') row.attempted++;
  }
  return DIFFICULTY_ORDER.map((n) => rows[n]).filter((r) => r.total > 0);
}

// Per topic (the labels the problems carry): size, solved, attempted
export function topicRows(allProblems, progressList, { minTotal = 5 } = {}) {
  const status = new Map(progressList.map((p) => [p.canonical_id, p.status]));
  const map = new Map();
  for (const p of dsaRows(allProblems)) {
    const s = status.get(p.canonical_id);
    for (const name of p.topics_display ?? p.topics ?? []) {
      let row = map.get(name);
      if (!row) map.set(name, (row = { name, total: 0, solved: 0, attempted: 0 }));
      row.total++;
      if (s === 'solved') row.solved++;
      else if (s === 'attempted') row.attempted++;
    }
  }
  return [...map.values()]
    .filter((r) => r.total >= minTotal)
    .sort((a, b) => b.solved + b.attempted - (a.solved + a.attempted) || b.solved - a.solved || a.name.localeCompare(b.name));
}

// The rows the chart draws: topics the user has touched, most active first
export const chartTopics = (rows, limit = 8) => rows.filter((r) => r.solved + r.attempted > 0).slice(0, limit);

// Needs 3+ topics, otherwise a radar is a line or a sliver and the toggle
export const canShowRadar = (rows) => rows.length >= 3;

// Strongest: at least 3 solved, ranked by how much of the topic is done
export function strongestTopics(rows, limit = 3) {
  return rows
    .filter((r) => r.solved >= 3)
    .sort((a, b) => b.solved / b.total - a.solved / a.total || b.solved - a.solved || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// Needs attention: tried at least as many as cracked (and at least one tried)
export function needsAttentionTopics(rows, limit = 3) {
  return rows
    .filter((r) => r.attempted >= 1 && r.attempted >= r.solved)
    .sort((a, b) => b.attempted - a.attempted || a.solved - b.solved || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// Compact roadmap view for the dashboard
export function roadmapView(levels, nameBySlug = {}) {
  const solved = levels.reduce((n, l) => n + l.solvedProblems, 0);
  const total = levels.reduce((n, l) => n + l.totalProblems, 0);
  const currentIdx = levels.findIndex((l) => l.isUnlocked && !l.isComplete);

  const steps = levels.map((l, i) => ({
    level: l.level,
    title: l.title,
    solved: l.solvedProblems,
    total: l.totalProblems,
    pct: l.totalProblems ? Math.round((l.solvedProblems / l.totalProblems) * 100) : 0,
    state: i === currentIdx ? 'current' : l.isComplete ? 'done' : l.isUnlocked ? 'open' : 'locked',
  }));

  const cur = currentIdx >= 0 ? levels[currentIdx] : null;
  const topics = cur
    ? cur.topics.filter((t) => !t.isEmpty).map((t) => ({
        slug: t.slug,
        name: nameBySlug[t.slug] || t.slug,
        solved: t.solvedProblems,
        total: t.totalProblems,
        threshold: t.threshold,
        done: t.isComplete,
      }))
    : [];
  const next = levels[currentIdx + 1];
  return {
    steps,
    overall: { solved, total, pct: total ? Math.round((solved / total) * 100) : 0 },
    current: cur && {
      level: cur.level,
      title: cur.title,
      description: cur.description,
      solved: cur.solvedProblems,
      total: cur.totalProblems,
      pct: cur.totalProblems ? Math.round((cur.solvedProblems / cur.totalProblems) * 100) : 0,
      topics,
      nextTopic: topics.find((t) => !t.done) || null,
    },
    nextLock: cur && next && !next.isUnlocked
      ? { level: next.level, title: next.title, hint: formatLockHint(next.level, next.missingTopics, nameBySlug) }
      : null,
    allDone: levels.length > 0 && currentIdx === -1 && levels.every((l) => l.isComplete),
    notStarted: solved === 0,
  };
}

// Newest solve (DSA or CP) as an ISO string, for the History button
export function lastSolvedAt(progressList) {
  let best = null;
  for (const p of progressList) {
    if (p.status !== 'solved') continue;
    const at = solvedAt(p);
    if (at && (!best || at > best)) best = at;
  }
  return best;
}

// Latest DSA solves, newest first
export function recentSolves(progressList, allProblems, limit = 5) {
  const byId = new Map(dsaRows(allProblems).map((p) => [p.canonical_id, p]));
  return progressList
    .filter((p) => p.status === 'solved' && byId.has(p.canonical_id))
    .map((p) => {
      const prob = byId.get(p.canonical_id);
      return { canonical_id: p.canonical_id, title: prob.title, slug: prob.slug, difficulty: prob.difficulty, difficulty_label: prob.difficulty_label, at: solvedAt(p) };
    })
    .sort((a, b) => (b.at || '').localeCompare(a.at || '') || a.title.localeCompare(b.title))
    .slice(0, limit);
}

// Solved CP problems per rating band
export function cpBandRows(progressList, cpProblems) {
  if (!cpProblems) return [];
  const byId = new Map(cpProblems.map((p) => [p.canonical_id, p]));
  const counts = new Map(RATING_BANDS.map((b) => [b.key, 0]));
  for (const p of progressList) {
    if (p.status !== 'solved') continue;
    const prob = byId.get(p.canonical_id);
    if (!prob) continue;
    const rating = getDisplayRating(prob);
    const band = rating == null
      ? RATING_BANDS[0]
      : RATING_BANDS.find((b) => b.key !== 'unrated' && rating >= b.min && rating <= b.max);
    if (band) counts.set(band.key, counts.get(band.key) + 1);
  }
  return RATING_BANDS.map((b) => ({ key: b.key, label: b.label, color: b.color, count: counts.get(b.key) }));
}

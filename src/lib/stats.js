/**
 * Verbatim port of backend/services/progress.service.js's getStats,
 * calcStreaks, calcWeeklySolves.
 *
 * Runs entirely off already-in-memory data: the progress list from the
 * live Firestore listener (services/firestore.js) and the problems array
 * from services/content/dataClient.js. Zero additional reads triggered —
 * see docs/04-FIRESTORE-SCHEMA-AND-RULES.md cost-optimization table, row 2.
 */

import { getDsaProblemsMap } from './problems.filter.js';

/**
 * @param {Array<{canonical_id, status, first_solved_at}>} progressList
 * @param {Array} allProblems - full problems.json array (for getDsaProblemsMap)
 */
export function getStats(progressList, allProblems) {
  const problemMap = getDsaProblemsMap(allProblems);

  const byDifficulty = { Easy: 0, Medium: 0, Hard: 0, Expert: 0 };
  const byTopic = {};
  const solvesByDate = {};

  let totalSolved = 0;
  let totalAttempted = 0;

  for (const p of progressList) {
    if (p.status === 'attempted') totalAttempted++;
    if (p.status !== 'solved') continue;

    totalSolved++;

    const prob = problemMap[p.canonical_id];
    if (prob) {
      const score = prob.difficulty ?? null;
      if (score === null) byDifficulty.Easy++;
      else if (score <= 4) byDifficulty.Easy++;
      else if (score <= 6) byDifficulty.Medium++;
      else if (score <= 8) byDifficulty.Hard++;
      else byDifficulty.Expert++;

      for (const topic of (prob.topics || [])) {
        byTopic[topic] = (byTopic[topic] || 0) + 1;
      }
    }

    if (p.first_solved_at) {
      const day = p.first_solved_at.slice(0, 10);
      solvesByDate[day] = (solvesByDate[day] || 0) + 1;
    }
  }

  const { currentStreak, longestStreak } = calcStreaks(solvesByDate);
  const weeklySolves = calcWeeklySolves(solvesByDate, 12);

  const topTopics = Object.entries(byTopic)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return {
    total_solved: totalSolved,
    total_attempted: totalAttempted,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    weekly_solves: weeklySolves,
    by_difficulty: byDifficulty,
    top_topics: topTopics,
    solves_by_date: solvesByDate,
  };
}

export function calcStreaks(solvesByDate) {
  const dates = Object.keys(solvesByDate).sort();
  if (!dates.length) return { currentStreak: 0, longestStreak: 0 };

  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);

    if (diff === 1) {
      streak++;
    } else {
      longestStreak = Math.max(longestStreak, streak);
      streak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, streak);

  const today = new Date().toISOString().slice(0, 10);
  const lastDate = dates[dates.length - 1];
  const daysSinceLast = (new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24);
  currentStreak = daysSinceLast <= 1 ? streak : 0;

  return { currentStreak, longestStreak };
}

export function calcWeeklySolves(solvesByDate, numWeeks) {
  const weeks = [];
  const today = new Date();

  for (let w = numWeeks - 1; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - w * 7 - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    let count = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const key = day.toISOString().slice(0, 10);
      count += solvesByDate[key] || 0;
    }
    weeks.push(count);
  }

  return weeks;
}

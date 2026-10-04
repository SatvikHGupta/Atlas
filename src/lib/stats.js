/*
  Dashboard stats. Runs entirely off already-in-memory data: the progress list from the Firestore store and the
  problem indexes from services/content/dataClient.js. Zero additional reads.

  BUG-154/155/156: DSA and CP are reported as SEPARATE populations (`dsa`, `cp`) plus one `activity` section that
  covers every solve, so a total and its breakdown always describe the same set of problems.
  BUG-061: every calendar day is the viewer's LOCAL day (lib/dates.js), never a UTC slice of an ISO string.
*/

import { getDsaProblemsMap } from './problems.filter.js';
import { getDifficultyBucket } from './difficulty.utils.js';
import { localDateKey, todayKey, addDays, daysBetween } from './dates.js';

// Same buckets as everywhere else (lib/difficulty.utils.js); a row with no difficulty counts as Easy here.
const difficultyBucket = (score) => getDifficultyBucket(score) ?? 'Easy';

// One population (DSA or CP): solved count, difficulty buckets, top topics.
function emptySection() {
  return { solved: 0, attempted: 0, by_difficulty: { Easy: 0, Medium: 0, Hard: 0, Expert: 0 }, byTopic: {} };
}

function addSolved(section, prob) {
  section.solved++;
  section.by_difficulty[difficultyBucket(prob.difficulty ?? null)]++;
  for (const topic of (prob.topics_display ?? prob.topics ?? [])) {
    section.byTopic[topic] = (section.byTopic[topic] || 0) + 1;
  }
}

function finishSection({ solved, attempted, by_difficulty, byTopic }, loaded = true) {
  const top_topics = Object.entries(byTopic)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
  return { solved, attempted, by_difficulty, top_topics, loaded };
}

/*
  @param {Array<{canonical_id, status, first_solved_at}>} progressList
  @param {Array} allProblems - DSA index (for getDsaProblemsMap)
  @param {Array} [cpProblems] - CP index; omit while it is not loaded (cp.loaded === false)
  @param {Date} [now]
*/
export function getStats(progressList, allProblems, cpProblems, now = new Date()) {
  const dsaMap = getDsaProblemsMap(allProblems);
  const cpMap = cpProblems ? new Map(cpProblems.map((p) => [p.canonical_id, p])) : null;

  const dsa = emptySection();
  const cp = emptySection();
  const solvesByDate = {};
  let totalSolved = 0;
  let totalAttempted = 0;
  let unclassifiedSolved = 0; // solved ids found in neither index (removed problem, or CP index not loaded)

  for (const p of progressList) {
    const dsaProb = dsaMap[p.canonical_id];
    const cpProb = dsaProb ? null : cpMap?.get(p.canonical_id);

    if (p.status === 'attempted') {
      totalAttempted++;
      if (dsaProb) dsa.attempted++;
      else if (cpProb) cp.attempted++;
    }
    if (p.status !== 'solved') continue;

    totalSolved++;
    if (dsaProb) addSolved(dsa, dsaProb);
    else if (cpProb) addSolved(cp, cpProb);
    else unclassifiedSolved++;

    if (p.first_solved_at) {
      const day = localDateKey(p.first_solved_at); // BUG-061: local day, not UTC slice
      if (day) solvesByDate[day] = (solvesByDate[day] || 0) + 1;
    }
  }

  const { currentStreak, longestStreak } = calcStreaks(solvesByDate, now);
  const weeklySolves = calcWeeklySolves(solvesByDate, 12, now);
  const dsaSection = finishSection(dsa);
  const activity = {
    solved: totalSolved,
    attempted: totalAttempted,
    unclassified_solved: unclassifiedSolved,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    weekly_solves: weeklySolves,
    solves_by_date: solvesByDate,
  };

  return {
    dsa: dsaSection,
    cp: finishSection(cp, !!cpMap),
    activity,
    // Deprecated flat aliases so older callers keep working. total_* and streaks are ALL activity
    // (DSA + CP); by_difficulty and top_topics are DSA only, exactly as before. New code uses the sections.
    total_solved: activity.solved,
    total_attempted: activity.attempted,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    weekly_solves: weeklySolves,
    by_difficulty: dsaSection.by_difficulty,
    top_topics: dsaSection.top_topics,
    solves_by_date: solvesByDate,
  };
}

export function calcStreaks(solvesByDate, now = new Date()) {
  const dates = Object.keys(solvesByDate).sort();
  if (!dates.length) return { currentStreak: 0, longestStreak: 0 };

  let longestStreak = 0;
  let streak = 1;

  for (let i = 1; i < dates.length; i++) {
    if (daysBetween(dates[i - 1], dates[i]) === 1) {
      streak++;
    } else {
      longestStreak = Math.max(longestStreak, streak);
      streak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, streak);

  const daysSinceLast = daysBetween(dates[dates.length - 1], todayKey(now));
  const currentStreak = daysSinceLast <= 1 ? streak : 0;

  return { currentStreak, longestStreak };
}

// Sunday-based weeks, oldest first, all in local days.
export function calcWeeklySolves(solvesByDate, numWeeks, now = new Date()) {
  const weeks = [];
  const today = todayKey(now);
  const dow = now.getDay();

  for (let w = numWeeks - 1; w >= 0; w--) {
    const weekStart = addDays(today, -(w * 7) - dow);
    let count = 0;
    for (let d = 0; d < 7; d++) count += solvesByDate[addDays(weekStart, d)] || 0;
    weeks.push(count);
  }

  return weeks;
}

// GitHub-style calendar grid: weeksCount columns of 7 local days, ending on the current week's Saturday.
export function buildHeatmapWeeks(solvesByDate, weeksCount, now = new Date()) {
  const today = todayKey(now);
  const endOfWeek = addDays(today, 6 - now.getDay());
  let cursor = addDays(endOfWeek, -(weeksCount * 7 - 1));

  const weeks = [];
  for (let w = 0; w < weeksCount; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      days.push({ date: cursor, count: solvesByDate[cursor] || 0, future: cursor > today });
      cursor = addDays(cursor, 1);
    }
    weeks.push(days);
  }
  return weeks;
}

// "Sep" for a local "YYYY-MM-DD" key. Parsed by hand: new Date("2026-09-27") is UTC midnight and would
// show the wrong month west of UTC (BUG-061, month labels).
export function monthNameOfKey(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short' });
}

/*
  Groups entries by local calendar day, newest first (BUG-061, History). Entries without a usable
  timestamp go to a final group with day === null instead of being dropped silently.
  @param {Array} entries
  @param {(entry) => string} pick - returns the ISO timestamp used for grouping and sorting
*/
export function groupByLocalDay(entries, pick) {
  const dated = [];
  const undated = [];
  for (const e of entries) {
    const key = pick(e) ? localDateKey(pick(e)) : null;
    if (key) dated.push({ e, key, t: new Date(pick(e)).getTime() });
    else undated.push(e);
  }
  dated.sort((a, b) => b.t - a.t);

  const groups = [];
  for (const { e, key } of dated) {
    const last = groups[groups.length - 1];
    if (last && last.day === key) last.entries.push(e);
    else groups.push({ day: key, entries: [e] });
  }
  if (undated.length) groups.push({ day: null, entries: undated });
  return groups;
}

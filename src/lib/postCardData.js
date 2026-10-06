// Turns what the dashboard already knows into the plain object lib/postCard.js draws. Author: Satvik Hemant Gupta
import { difficultyRows, topicRows } from './dashboardData.js';

const sinceOf = (user) => {
  const raw = user?.metadata?.creationTime;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

export function buildPostCardData({ user, stats, allProblems, progressList }) {
  const topics = topicRows(allProblems, progressList, { minTotal: 1 })
    .filter((t) => t.solved > 0)
    .sort((a, b) => b.solved - a.solved || a.name.localeCompare(b.name))
    .slice(0, 4)
    .map((t) => ({ name: t.name, solved: t.solved }));
  return {
    name: user?.displayName?.trim() || user?.email?.split('@')[0] || 'Atlas learner',
    since: sinceOf(user),
    photo: user?.photoURL || null, // loaded as an image by postCardDownload.js, letter shown if it can not be used
    dsa: stats.dsa.solved,
    cp: stats.cp.solved,
    streak: stats.activity.current_streak,
    best: stats.activity.longest_streak,
    difficulty: difficultyRows(allProblems, progressList).map((r) => ({ name: r.name, solved: r.solved })),
    topics,
  };
}

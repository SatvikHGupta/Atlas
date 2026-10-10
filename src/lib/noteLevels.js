// Note level metadata shared by the notes list and the note reader. Author: Satvik Hemant Gupta

export const NOTE_LEVEL_COLORS = {
  0: '#6c63ff',
  1: '#22c55e',
  2: '#f97316',
  3: '#06b6d4',
  4: '#a855f7',
  5: '#facc15',
  6: '#ec4899',
  7: '#14b8a6',
  8: '#94a3b8',
  9: '#ef4444',
};

// The same colour as a CSS variable
export function levelColorVar(level, colors = NOTE_LEVEL_COLORS) {
  levelColor(level, colors);
  return `var(--level-${level})`;
}

// Highest level found in a notes index array ({level} rows)
export function getStarLevel(topics) {
  if (!topics?.length) throw new Error('notes index is empty, no star level');
  return Math.max(...topics.map((t) => t.level));
}

// Colour for a level, or throw so a missing palette entry breaks the build
export function levelColor(level, colors = NOTE_LEVEL_COLORS) {
  const color = colors[level];
  if (!color) throw new Error(`no colour defined for note level ${level}`);
  return color;
}

// Badge text: a star for the last level, the number for all others
export function levelBadgeLabel(level, starLevel) {
  return `Level ${level === starLevel ? '\u2605' : level}`;
}

// Levels in `topics` that have no colour, or share a colour with another level
export function paletteProblems(topics, colors = NOTE_LEVEL_COLORS) {
  const levels = [...new Set(topics.map((t) => t.level))];
  const problems = [];
  const seen = new Map();
  for (const level of levels) {
    const color = colors[level];
    if (!color) {
      problems.push(`level ${level} has no colour`);
      continue;
    }
    if (seen.has(color))
      problems.push(`levels ${seen.get(color)} and ${level} share ${color}`);
    else seen.set(color, level);
  }
  return problems;
}

const DIFFICULTY_MAP = {
  1: { label: 'Beginner', color: 'var(--diff-beginner)', bg: 'var(--diff-beginner-bg)' },
  2: { label: 'Beginner', color: 'var(--diff-beginner)', bg: 'var(--diff-beginner-bg)' },
  3: { label: 'Easy',     color: 'var(--diff-easy)',     bg: 'var(--diff-easy-bg)' },
  4: { label: 'Easy',     color: 'var(--diff-easy)',     bg: 'var(--diff-easy-bg)' },
  5: { label: 'Medium',   color: 'var(--diff-medium)',   bg: 'var(--diff-medium-bg)' },
  6: { label: 'Medium',   color: 'var(--diff-medium)',   bg: 'var(--diff-medium-bg)' },
  7: { label: 'Hard',     color: 'var(--diff-hard)',     bg: 'var(--diff-hard-bg)' },
  8: { label: 'Hard',     color: 'var(--diff-hard)',     bg: 'var(--diff-hard-bg)' },
  9: { label: 'Expert',   color: 'var(--diff-expert)',   bg: 'var(--diff-expert-bg)' },
  10:{ label: 'Expert',   color: 'var(--diff-expert)',   bg: 'var(--diff-expert-bg)' },
};

export const getDifficultyColor = (score) =>
  DIFFICULTY_MAP[score]?.color || 'var(--text-muted)';

export const getDifficultyBg = (score) =>
  DIFFICULTY_MAP[score]?.bg || 'var(--bg-elevated)';

export const getDifficultyLabel = (score) =>
  DIFFICULTY_MAP[score]?.label || 'Unknown';

// BUG-08: ONE coarse bucketing for dashboard, share images and structured data. It collapses the 5 badge labels:
// Beginner+Easy (1-4) -> Easy, Medium (5-6), Hard (7-8), Expert (9-10). Unknown/null -> null.
export const getDifficultyBucket = (score) => {
  if (score == null || Number.isNaN(Number(score))) return null;
  if (score <= 4) return 'Easy';
  if (score <= 6) return 'Medium';
  if (score <= 8) return 'Hard';
  return 'Expert';
};

// schema.org educationalLevel for the same buckets
export const getEducationalLevel = (score) => {
  const bucket = getDifficultyBucket(score);
  if (bucket === 'Easy') return 'Beginner';
  if (bucket === 'Medium') return 'Intermediate';
  return bucket ? 'Advanced' : undefined;
};

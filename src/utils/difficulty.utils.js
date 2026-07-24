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
  DIFFICULTY_MAP[score]?.bg || 'rgba(90,90,114,0.1)';

export const getDifficultyLabel = (score) =>
  DIFFICULTY_MAP[score]?.label || 'Unknown';

export const getDifficultyInfo = (score) =>
  DIFFICULTY_MAP[score] || { label: 'Unknown', color: 'var(--text-muted)', bg: 'rgba(90,90,114,0.1)' };

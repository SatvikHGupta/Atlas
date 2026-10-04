// Mode-level defaults. A theme only supplies its own colors; everything that is the same for every dark theme or
// every light theme lives here, once. 

// Dark is the baseline: the difficulty/solved/attempted tokens in styles/theme.css are already tuned for dark
// surfaces, so a dark theme does not need to re-state them.
export const DARK_TOKENS = {
  // Notes level colors (0-9). Dark values equal NOTE_LEVEL_COLORS in src/lib/noteLevels.js (a test keeps them in sync).
  'level-0': '#6c63ff',
  'level-1': '#22c55e',
  'level-2': '#f97316',
  'level-3': '#06b6d4',
  'level-4': '#a855f7',
  'level-5': '#facc15',
  'level-6': '#ec4899',
  'level-7': '#14b8a6',
  'level-8': '#94a3b8',
  'level-9': '#ef4444',
  // Lightness for hue-generated colors (territory bars, company/pattern cards): fills, and text on a surface.
  'hue-l': '58%',
  'hue-text-l': '70%',
};

// Light surfaces need darker status colors to stay readable as text on white (BUG-018/019).
export const LIGHT_TOKENS = {
  'diff-beginner': '#166534',
  'diff-easy': '#0f766e',
  'diff-medium': '#a16207',
  'diff-hard': '#c2410c',
  'diff-expert': '#b91c1c',
  'diff-beginner-bg': 'rgba(22, 101, 52, 0.1)',
  'diff-easy-bg': 'rgba(15, 118, 110, 0.1)',
  'diff-medium-bg': 'rgba(161, 98, 7, 0.1)',
  'diff-hard-bg': 'rgba(194, 65, 12, 0.1)',
  'diff-expert-bg': 'rgba(185, 28, 28, 0.1)',
  attempted: '#c2410c',
  'attempted-bg': 'rgba(194, 65, 12, 0.1)',
  'solved-fg': '#ffffff',
  'cyan-fg': '#ffffff',
  'danger-fg': '#ffffff',
  'attempted-fg': '#ffffff',
  // Same hues as dark, darkened so level badges and labels stay readable on white.
  'level-0': '#4f46e5',
  'level-1': '#15803d',
  'level-2': '#c2410c',
  'level-3': '#0e7490',
  'level-4': '#7e22ce',
  'level-5': '#a16207',
  'level-6': '#be185d',
  'level-7': '#0f766e',
  'level-8': '#475569',
  'level-9': '#b91c1c',
  'hue-l': '42%',
  'hue-text-l': '30%',
};

// Used when a mode does not define its own value for an optional color.
export const MODE_DEFAULTS = {
  dark: {
    accents: { cyan: '#22d3ee', emerald: '#34d399', rose: '#fb7185', amber: '#fbbf24' },
    subtleAlpha: 0.12,
    glowAlpha: 0.3,
    statusBgAlpha: 0.08, // --solved-bg
    shadowAlpha: [0.4, 0.5, 0.6],
    glowAlphas: [0.14, 0.08],
  },
  light: {
    accents: { cyan: '#0e7490', emerald: '#059669', rose: '#e11d48', amber: '#d97706' },
    subtleAlpha: 0.08,
    glowAlpha: 0.22,
    statusBgAlpha: 0.1,
    shadowAlpha: [0.08, 0.08, 0.12],
    glowAlphas: [0.12, 0.08],
  },
};

export const INK = '#0a0a0f'; // text color placed on a bright primary in dark themes
export const PAPER = '#ffffff';

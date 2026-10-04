// MODES - the two base palettes (backgrounds, surfaces, text, borders, status colors, code blocks).
// An accent (src/themes/<accent>.js) is layered on top of a mode, so a visitor picks Light/Dark AND an accent.
// Edit a mode here and every accent follows; nothing else in the app lists colors.

export const dark = {
  id: 'dark',
  name: 'Dark',
  description: 'Near-black surfaces, easy on the eyes at night.',
  shiki: 'github-dark-dimmed', // syntax theme for code blocks in this mode

  colors: {
    background:    '#07070b',
    surface:       '#111118',
    surfaceAlt:    '#0c0c12',
    text:          '#ececf2',
    textMuted:     '#8c8ca2',
    border:        'rgba(255, 255, 255, 0.08)',
    success:       '#22c55e',
    warning:       '#f59e0b',
    danger:        '#ef4444',

    // Optional fine-tuning (derived from the colors above when left out, see src/theme/theme-utils.js).
    textSecondary: '#a4a4b8',
    surfaceHover:  '#181824',
    elevated:      '#202030',
    borderSubtle:  'rgba(255, 255, 255, 0.04)',
    borderStrong:  'rgba(255, 255, 255, 0.15)',
  },

  // Code blocks follow the mode: dark page, dark code; light page, light code.
  code: {
    background: '#0d0d14',
    border:     'rgba(255, 255, 255, 0.08)',
    text:       '#e8e8f0',
  },
};

export const light = {
  id: 'light',
  name: 'Light',
  description: 'White surfaces, best in bright rooms.',
  shiki: 'github-light',

  colors: {
    background:    '#f8f9fb',
    surface:       '#ffffff',
    surfaceAlt:    '#f0f2f5',
    text:          '#0f172a',
    textMuted:     '#556377',
    border:        'rgba(15, 23, 42, 0.09)',
    success:       '#15803d',
    warning:       '#a16207',
    danger:        '#b91c1c',

    textSecondary: '#475569',
    surfaceHover:  '#f6f7f9',
    elevated:      '#e5e8ed',
  },

  code: {
    background: '#f6f8fa',
    border:     'rgba(15, 23, 42, 0.12)',
    text:       '#24292f',
  },
};

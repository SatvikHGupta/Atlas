// Turns the site's CSS variables into the plain colours Chart.js needs (canvas cannot read `var(--x)`). Pure: the caller
// passes a `getVar(name)` function, so this is testable without a browser. Author: Satvik Hemant Gupta
//
// Colours come from the active mode + accent (see src/themes), so a chart always matches the page around it. Every token has
// a fallback, so a missing variable can never produce an invisible chart.

const FALLBACK = {
  '--text-primary': '#ececf2',
  '--text-secondary': '#a4a4b8',
  '--text-muted': '#8c8ca2',
  '--border': 'rgba(255, 255, 255, 0.08)',
  '--bg-card': '#111118',
  '--bg-elevated': '#202030',
  '--accent': '#8b5cf6',
  '--accent-rgb': '139, 92, 246',
  '--diff-easy': '#4ade80',
  '--diff-medium': '#facc15',
  '--diff-hard': '#fb923c',
  '--diff-expert': '#f87171',
  '--attempted': '#fb923c',
  '--solved': '#22c55e',
};

/** '#rgb' or '#rrggbb' -> 'r, g, b'; anything else -> null. */
export function hexToRgbTriplet(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ');
}

/** `rgba(r, g, b, a)` from a 'r, g, b' triplet. */
export const withAlpha = (triplet, alpha) => `rgba(${triplet}, ${alpha})`;

/** A colour with transparency. Hex colours get an alpha; anything else (rgb(), hsl(), a name) is returned unchanged,
    because a fully opaque correct colour is better than a broken one. */
export function softColor(color, alpha) {
  const triplet = hexToRgbTriplet(color);
  return triplet ? withAlpha(triplet, alpha) : color;
}

/**
 * @param {(name:string)=>string} getVar  returns the computed value of a CSS custom property ('' when unset)
 * @param {string} [fontFamily]
 */
export function readChartTheme(getVar, fontFamily = 'system-ui, sans-serif') {
  const v = (name) => (getVar(name) || '').trim() || FALLBACK[name];
  const accent = v('--accent');
  // --accent-rgb is the exact triplet when the theme defines it; otherwise derive it from the accent colour itself
  const accentRgb = (getVar('--accent-rgb') || '').trim() || hexToRgbTriplet(accent) || FALLBACK['--accent-rgb'];
  return {
    font: fontFamily,
    text: v('--text-primary'),
    textSecondary: v('--text-secondary'),
    muted: v('--text-muted'),
    border: v('--border'),
    card: v('--bg-card'),
    elevated: v('--bg-elevated'),
    accent,
    accentRgb,
    solved: v('--solved'),
    attempted: v('--attempted'),
    difficulty: { Easy: v('--diff-easy'), Medium: v('--diff-medium'), Hard: v('--diff-hard'), Expert: v('--diff-expert') },
  };
}

/** Reads the live theme from the document. Browser only. */
export function readDocumentChartTheme() {
  const cs = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  return readChartTheme((name) => cs.getPropertyValue(name), body.fontFamily);
}

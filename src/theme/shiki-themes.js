// Syntax-highlighting themes for code blocks, one per mode, read from the mode registry. Shiki renders BOTH palettes
// into every highlighted block as CSS variables (--shiki-dark / --shiki-light); src/styles/global.css picks the one
// that matches <html data-mode>, so switching mode recolors code instantly with no re-render and no rebuild.
// Used at build time (scripts/build-content.mjs for solutions) and by notes (src/lib/server/highlight.server.js).
import { MODE_LIST } from '../themes/index.js';

/** { dark: 'github-dark-dimmed', light: 'github-light' } - keyed by mode id, which is also the CSS variable suffix. */
export const SHIKI_THEMES = Object.freeze(Object.fromEntries(MODE_LIST.map((mode) => [mode.id, mode.shiki])));

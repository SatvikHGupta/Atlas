// The stylesheet generated from the registry, plus a content-versioned URL for it. Used by the route that serves it
// (src/app/themes.css/route.js) and by the root layout that links it, so both always refer to the same bytes.
import { MODE_LIST, COLOR_LIST, DEFAULT_MODE_ID, DEFAULT_ACCENT_ID } from '../themes/index.js';
import { buildThemeCss, fingerprint } from './theme-utils.js';

export const THEME_CSS = buildThemeCss(MODE_LIST, COLOR_LIST, DEFAULT_MODE_ID, DEFAULT_ACCENT_ID);
// The version changes whenever any theme color changes, so the file can be cached forever.
export const THEME_CSS_HREF = `/themes.css?v=${fingerprint(THEME_CSS)}`;

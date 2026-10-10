// The stylesheet generated from the registry, plus a content-versioned URL
import { MODE_LIST, COLOR_LIST, DEFAULT_MODE_ID, DEFAULT_ACCENT_ID } from '../themes/index.js';
import { buildThemeCss, fingerprint } from './theme-utils.js';

export const THEME_CSS = buildThemeCss(MODE_LIST, COLOR_LIST, DEFAULT_MODE_ID, DEFAULT_ACCENT_ID);
export const THEME_CSS_HREF = `/themes.css?v=${fingerprint(THEME_CSS)}`;

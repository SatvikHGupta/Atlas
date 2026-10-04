// Persistence + the pre-paint init script. The ONLY place the localStorage keys are defined.
import {
  MODE_IDS, ACCENT_IDS, ACCENT_ALIASES, LEGACY_THEMES, DEFAULT_MODE_ID, DEFAULT_ACCENT_ID,
} from '../themes/index.js';

export const MODE_STORAGE_KEY = 'atlas-mode';
export const ACCENT_STORAGE_KEY = 'atlas-accent';
// Partner colour: the id of the accent whose secondary is used. Absent means Auto (the active accent's own).
export const SECONDARY_STORAGE_KEY = 'atlas-secondary';
// Before modes and accents existed one value held the whole theme. It is read once, migrated, then removed.
export const LEGACY_STORAGE_KEY = 'atlas-theme';

/**
 * Inline script that runs before first paint (and before React) so a saved theme never flashes: it reads the saved
 * mode, accent and partner colour, validates them against the registry, sets <html data-mode data-accent data-secondary>, migrates an old
 * single-value theme and repairs bad stored values. Everything it needs is serialized from the registry at render
 * time, so it can never disagree with the theme list.
 *
 * It must stay inline and render-blocking. next/script "beforeInteractive" is queued by the client runtime in the
 * App Router, which would bring the flash back. Keep the logic identical to resolveTheme() - the registry tests run
 * both against the same inputs.
 */
export function buildThemeInitScript({
  modes = MODE_IDS,
  accents = ACCENT_IDS,
  aliases = ACCENT_ALIASES,
  legacyThemes = LEGACY_THEMES,
  defaultMode = DEFAULT_MODE_ID,
  defaultAccent = DEFAULT_ACCENT_ID,
  keys = { mode: MODE_STORAGE_KEY, accent: ACCENT_STORAGE_KEY, secondary: SECONDARY_STORAGE_KEY, legacy: LEGACY_STORAGE_KEY },
} = {}) {
  const j = JSON.stringify;
  return `(function(){var d=document.documentElement,M=${j(modes)},A=${j(accents)},AL=${j(aliases)},LG=${j(legacyThemes)},`
    + `K=${j(keys)},s=window.localStorage,m=null,a=null,c=null,l=null,has=Object.prototype.hasOwnProperty;`
    + `try{m=s.getItem(K.mode);a=s.getItem(K.accent);c=s.getItem(K.secondary);l=s.getItem(K.legacy)}catch(e){}`
    + `var pa=function(v){return A.indexOf(v)!==-1?v:(typeof v==='string'&&has.call(AL,v)?AL[v]:null)},`
    + `o=typeof l==='string'&&has.call(LG,l)?LG[l]:null,`
    + `rm=M.indexOf(m)!==-1?m:(o?o.mode:${j(defaultMode)}),`
    + `ra=pa(a)||(o?o.accent:${j(defaultAccent)}),rc=pa(c);`
    + `d.setAttribute('data-mode',rm);d.setAttribute('data-accent',ra);`
    + `if(rc)d.setAttribute('data-secondary',rc);else d.removeAttribute('data-secondary');`
    + `try{if((m!==null||l!==null)&&m!==rm)s.setItem(K.mode,rm);if((a!==null||l!==null)&&a!==ra)s.setItem(K.accent,ra);`
    + `if(c!==null&&c!==rc){if(rc)s.setItem(K.secondary,rc);else s.removeItem(K.secondary)}if(l!==null)s.removeItem(K.legacy)}catch(e){}})()`;
}

export const THEME_INIT_SCRIPT = buildThemeInitScript();

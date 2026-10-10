// Persistence + the pre-paint init script
import {
  MODE_IDS, COLOR_IDS, COLOR_ALIASES, LEGACY_THEMES, DEFAULT_MODE_ID, DEFAULT_ACCENT_ID,
} from '../themes/index.js';

export const MODE_STORAGE_KEY = 'atlas-mode';
export const ACCENT_STORAGE_KEY = 'atlas-accent';
export const SECONDARY_STORAGE_KEY = 'atlas-secondary';
export const LEGACY_STORAGE_KEY = 'atlas-theme';

// Inline script that runs before first paint
export function buildThemeInitScript({
  modes = MODE_IDS,
  accents = COLOR_IDS,
  aliases = COLOR_ALIASES,
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

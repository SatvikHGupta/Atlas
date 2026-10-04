// MASTER THEME REGISTRY. A theme is a MODE (Light | Dark, src/themes/modes.js) plus an ACCENT (one file per accent) plus
// an optional PARTNER colour: each accent carries a `secondary`, and a visitor can pair any accent's primary with any
// accent's secondary (mix and match), or leave it on Auto to use the accent's own.
//
// Everything else reads from here: the CSS (src/app/themes.css), Settings > Appearance, the pre-paint init script,
// the saved-value validation and the preview cards. None of them contain a list of their own.
//
// To add an accent:
//   1. Copy any accent file in this folder (e.g. frost.js) to src/themes/sunset.js; change id, name, description and
//      the colors for BOTH modes (dark and light).
//   2. Import it below and add it to ACCENT_DEFINITIONS.     <- the only edit outside the new file
//   3. Done. It shows up in Settings > Appearance > Accent (and as a partner colour option), previewed on whichever mode
//      the visitor has selected. `secondary` is optional; leave it out and the accent falls back to its readable shade.
//      Loading the registry (build, dev, tests) fails if a color is invalid or unreadable on either mode.
//
// (Imports are listed by hand on purpose: require.context-style auto discovery is webpack-only and Atlas builds with
// Turbopack, so a hand-written list is the reliable option.)
import { validateMode, validateAccent, validatePair } from '../theme/theme-utils.js';
import { dark, light } from './modes.js';
import atlas from './atlas.js';
import meadow from './meadow.js';
import ember from './ember.js';
import frost from './frost.js';
import cream from './cream.js';
import synthwave from './synthwave.js';
import toxic from './toxic.js';
import electric from './electric.js';
import periwinkle from './periwinkle.js';
import cherrycola from './cherrycola.js';
import caffeinatedwaffle from './caffeinatedwaffle.js';
import sentientkebab from './sentientkebab.js';
import midnightburrito from './midnightburrito.js';

/** Display order in Settings. */
const MODE_DEFINITIONS = [dark, light];
const ACCENT_DEFINITIONS = [
  atlas, meadow, ember, frost, cream,
  synthwave, toxic, electric, periwinkle, cherrycola, caffeinatedwaffle, sentientkebab, midnightburrito,
];

/** Used for first visits, missing/invalid saved values and as the :root fallback. Must be registered below. */
export const DEFAULT_MODE_ID = 'dark';
export const DEFAULT_ACCENT_ID = 'atlas';

/**
 * Themes from before modes and accents existed (saved under localStorage "atlas-theme"): old id -> the mode and
 * accent that look closest. Mono was nearly identical to Frost, so it maps there.
 */
export const LEGACY_THEMES = Object.freeze({
  atlas: { mode: 'dark', accent: 'atlas' },
  ember: { mode: 'dark', accent: 'ember' },
  meadow: { mode: 'dark', accent: 'meadow' },
  frost: { mode: 'light', accent: 'frost' },
  cream: { mode: 'light', accent: 'cream' },
  mono: { mode: 'light', accent: 'frost' },
});

function assertRegistry(modes, accents) {
  const problems = [];
  const modeIds = new Set();
  for (const def of modes) {
    const label = def?.id ? `mode "${def.id}"` : 'a mode';
    for (const error of validateMode(def)) problems.push(`${label}: ${error}`);
    if (def && typeof def.id === 'string') {
      if (modeIds.has(def.id)) problems.push(`${label}: duplicate id`);
      modeIds.add(def.id);
    }
  }
  for (const id of ['light', 'dark']) if (!modeIds.has(id)) problems.push(`mode "${id}" is not registered (both are required)`);

  const seen = new Set();
  const names = new Set();
  const aliasOwner = new Map();
  for (const def of accents) {
    const label = def?.id ? `accent "${def.id}"` : 'an accent';
    const errors = validateAccent(def);
    for (const error of errors) problems.push(`${label}: ${error}`);
    if (!def || typeof def.id !== 'string') continue;
    if (seen.has(def.id)) problems.push(`${label}: duplicate id`);
    seen.add(def.id);
    if (names.has(String(def.name).toLowerCase())) problems.push(`${label}: duplicate name "${def.name}"`);
    names.add(String(def.name).toLowerCase());
    for (const alias of def.aliases || []) {
      if (aliasOwner.has(alias)) problems.push(`${label}: alias "${alias}" is already used by "${aliasOwner.get(alias)}"`);
      aliasOwner.set(alias, def.id);
    }
    // Readability on every mode, only checkable once both the mode and the accent are well-formed.
    if (!errors.length) {
      for (const mode of modes) if (!validateMode(mode).length) for (const error of validatePair(mode, def)) problems.push(error);
    }
  }
  for (const [alias, owner] of aliasOwner) {
    if (seen.has(alias)) problems.push(`accent "${owner}": alias "${alias}" is also a real accent id`);
  }
  if (!seen.has(DEFAULT_ACCENT_ID)) problems.push(`DEFAULT_ACCENT_ID "${DEFAULT_ACCENT_ID}" is not a registered accent`);
  if (!modeIds.has(DEFAULT_MODE_ID)) problems.push(`DEFAULT_MODE_ID "${DEFAULT_MODE_ID}" is not a registered mode`);
  for (const [legacy, target] of Object.entries(LEGACY_THEMES)) {
    if (!modeIds.has(target.mode) || !seen.has(target.accent)) problems.push(`LEGACY_THEMES "${legacy}" points at an unregistered mode/accent`);
  }
  if (problems.length) {
    // Fail loudly at build/test/startup: a malformed theme must never reach users half-working.
    throw new Error(`Invalid theme registry (src/themes):\n - ${problems.join('\n - ')}`);
  }
}
assertRegistry(MODE_DEFINITIONS, ACCENT_DEFINITIONS);

const freezeAll = (defs) => Object.freeze(Object.fromEntries(defs.map((def) => [def.id, Object.freeze(def)])));

/** id -> definition, in display order. */
export const MODES = freezeAll(MODE_DEFINITIONS);
export const MODE_LIST = Object.freeze(Object.values(MODES));
export const MODE_IDS = Object.freeze(Object.keys(MODES));
export const ACCENTS = freezeAll(ACCENT_DEFINITIONS);
export const ACCENT_LIST = Object.freeze(Object.values(ACCENTS));
export const ACCENT_IDS = Object.freeze(Object.keys(ACCENTS));

/** Old accent ids that should keep working: alias -> current id (built from each accent's optional `aliases`). */
export const ACCENT_ALIASES = Object.freeze(
  Object.fromEntries(ACCENT_DEFINITIONS.flatMap((def) => (def.aliases || []).map((alias) => [alias, def.id]))),
);

export const getMode = (id) => MODES[id] ?? null;
export const getAccent = (id) => ACCENTS[id] ?? null;

/** Any stored/untrusted value -> a registered mode id, or null when it is not one. Never throws. */
export function parseModeId(value) {
  return typeof value === 'string' && Object.hasOwn(MODES, value) ? value : null;
}
/** Any stored/untrusted value -> a registered accent id (an old alias maps to its current id), or null. */
export function parseAccentId(value) {
  if (typeof value !== 'string') return null;
  if (Object.hasOwn(ACCENTS, value)) return value;
  if (Object.hasOwn(ACCENT_ALIASES, value)) return ACCENT_ALIASES[value];
  return null;
}

/** Partner colour = the id of the accent whose `secondary` is used. null means Auto (the active accent's own). */
export const parseSecondaryId = (value) => parseAccentId(value);

/**
 * Stored values -> the theme to show. A valid mode/accent wins; a missing one is filled from the legacy single
 * "atlas-theme" value when there is one, otherwise from the defaults. Keep the logic identical to the inline init
 * script in theme-storage.js - the registry tests run both against the same inputs.
 */
export function resolveTheme({ mode, accent, secondary, legacy } = {}) {
  const old = typeof legacy === 'string' && Object.hasOwn(LEGACY_THEMES, legacy) ? LEGACY_THEMES[legacy] : null;
  return {
    mode: parseModeId(mode) ?? old?.mode ?? DEFAULT_MODE_ID,
    accent: parseAccentId(accent) ?? old?.accent ?? DEFAULT_ACCENT_ID,
    secondary: parseAccentId(secondary),
  };
}

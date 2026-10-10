// MASTER THEME REGISTRY
import { validateMode, validateColor, validatePair } from '../theme/theme-utils.js';
import { dark, light } from './modes.js';
import { COLORS as COLOR_DEFINITIONS, DEFAULT_PRIMARY_ID } from './colors.js';

const MODE_DEFINITIONS = [dark, light];

export const DEFAULT_MODE_ID = 'dark';
export const DEFAULT_ACCENT_ID = DEFAULT_PRIMARY_ID;
export const DEFAULT_SECONDARY_ID = null;

export const LEGACY_THEMES = Object.freeze({
  atlas: { mode: 'dark', accent: 'atlas' },
  ember: { mode: 'dark', accent: 'orange' },
  meadow: { mode: 'dark', accent: 'green' },
  frost: { mode: 'light', accent: 'blue' },
  cream: { mode: 'light', accent: 'terracotta' },
  mono: { mode: 'light', accent: 'blue' },
});

function assertRegistry(modes, colors) {
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
  for (const def of colors) {
    const label = def?.id ? `colour "${def.id}"` : 'a colour';
    const errors = validateColor(def);
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
    if (!errors.length) {
      for (const mode of modes) if (!validateMode(mode).length) for (const error of validatePair(mode, def)) problems.push(error);
    }
  }
  for (const [alias, owner] of aliasOwner) {
    if (seen.has(alias)) problems.push(`colour "${owner}": alias "${alias}" is also a real colour id`);
  }
  if (!seen.has(DEFAULT_ACCENT_ID)) problems.push(`DEFAULT_PRIMARY_ID "${DEFAULT_ACCENT_ID}" is not a registered colour`);
  if (!modeIds.has(DEFAULT_MODE_ID)) problems.push(`DEFAULT_MODE_ID "${DEFAULT_MODE_ID}" is not a registered mode`);
  for (const [legacy, target] of Object.entries(LEGACY_THEMES)) {
    if (!modeIds.has(target.mode) || !seen.has(target.accent)) problems.push(`LEGACY_THEMES "${legacy}" points at an unregistered mode/colour`);
  }
  if (problems.length) {
    throw new Error(`Invalid theme registry (src/themes):\n - ${problems.join('\n - ')}`);
  }
}
assertRegistry(MODE_DEFINITIONS, COLOR_DEFINITIONS);

const freezeAll = (defs) => Object.freeze(Object.fromEntries(defs.map((def) => [def.id, Object.freeze(def)])));

export const MODES = freezeAll(MODE_DEFINITIONS);
export const MODE_LIST = Object.freeze(Object.values(MODES));
export const MODE_IDS = Object.freeze(Object.keys(MODES));
export const COLORS = freezeAll(COLOR_DEFINITIONS);
export const COLOR_LIST = Object.freeze(Object.values(COLORS));
export const COLOR_IDS = Object.freeze(Object.keys(COLORS));

export const COLOR_ALIASES = Object.freeze(
  Object.fromEntries(COLOR_DEFINITIONS.flatMap((def) => (def.aliases || []).map((alias) => [alias, def.id]))),
);

export const getMode = (id) => MODES[id] ?? null;
export const getColor = (id) => COLORS[id] ?? null;

// Any stored/untrusted value -> a registered mode id
export function parseModeId(value) {
  return typeof value === 'string' && Object.hasOwn(MODES, value) ? value : null;
}
// Any stored/untrusted value -> a registered colour id
export function parseColorId(value) {
  if (typeof value !== 'string') return null;
  if (Object.hasOwn(COLORS, value)) return value;
  if (Object.hasOwn(COLOR_ALIASES, value)) return COLOR_ALIASES[value];
  return null;
}

// Stored values -> the theme to show
export function resolveTheme({ mode, accent, secondary, legacy } = {}) {
  const old = typeof legacy === 'string' && Object.hasOwn(LEGACY_THEMES, legacy) ? LEGACY_THEMES[legacy] : null;
  return {
    mode: parseModeId(mode) ?? old?.mode ?? DEFAULT_MODE_ID,
    accent: parseColorId(accent) ?? old?.accent ?? DEFAULT_ACCENT_ID,
    secondary: parseColorId(secondary),
  };
}

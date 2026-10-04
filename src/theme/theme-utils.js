// Theme engine: validates mode + accent definitions and turns them into CSS custom properties. Pure functions, no
// DOM, no framework - runs the same in Node (build, route handler, tests) and in the browser.
//
// A theme is a MODE (light | dark: backgrounds, text, borders, status colors, code blocks) plus an ACCENT (the brand
// color) plus an optional partner colour (secondary) that defaults to the accent's own but can come from any accent, so
// primaries and partners can be mixed and matched. The CSS has one block per mode, one per mode+accent pair (accent
// tokens) and one per secondary (the --accent-2 override).
import { DARK_TOKENS, LIGHT_TOKENS, MODE_DEFAULTS, INK, PAPER } from './theme-presets.js';

// ---------------------------------------------------------------- the contract
export const MODE_REQUIRED_COLORS = ['background', 'surface', 'surfaceAlt', 'text', 'textMuted', 'border', 'success', 'warning', 'danger'];
export const MODE_OPTIONAL_COLORS = [
  'textSecondary', 'surfaceHover', 'elevated', 'borderSubtle', 'borderStrong', 'cyan', 'emerald', 'rose', 'amber',
];
export const ACCENT_REQUIRED_COLORS = ['primary', 'primaryHover', 'primaryLight'];
export const ACCENT_OPTIONAL_COLORS = ['onPrimary', 'primarySubtle', 'primaryGlow'];
export const CODE_KEYS = ['background', 'border', 'text'];
const MODE_KEYS = ['id', 'name', 'description', 'shiki', 'colors', 'code'];
const ACCENT_KEYS = ['id', 'name', 'description', 'aliases', 'secondary', 'dark', 'light'];
export const MODES = ['light', 'dark'];

// Contrast floors (WCAG). Enforced for every mode+accent pair when the registry loads, so a bad color fails the build.
export const MIN_TEXT_CONTRAST = 4.5; // text on its surface
export const MIN_UI_CONTRAST = 3; // a filled accent against the page

// ---------------------------------------------------------------- color math
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i;

/** Parses #rgb / #rgba / #rrggbb / #rrggbbaa / rgb() / rgba(). Returns {r,g,b,a} or null. */
export function parseColor(input) {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  const hex = HEX.exec(value);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const rgb = RGB.exec(value);
  if (rgb) {
    const [r, g, b] = [rgb[1], rgb[2], rgb[3]].map(Number);
    const a = rgb[4] === undefined ? 1 : Number(rgb[4]);
    if (r > 255 || g > 255 || b > 255 || a > 1) return null;
    return { r, g, b, a };
  }
  return null;
}

const hex2 = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
export const toHex = ({ r, g, b }) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;
const fmtAlpha = (a) => String(Math.round(a * 1000) / 1000);
export const toRgba = ({ r, g, b }, a) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${fmtAlpha(a)})`;
export const toTriplet = ({ r, g, b }) => `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;

/** Blend two colors; t = share of `b` (0..1). Returns an opaque #rrggbb. */
export function mix(a, b, t) {
  const x = parseColor(a);
  const y = parseColor(b);
  return toHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}

const channel = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export function luminance(color) {
  const { r, g, b } = parseColor(color);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
/** WCAG contrast ratio (1..21). */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}
/** Whichever of white / near-black reads better on `background`. */
export const readableOn = (background) => (contrast(PAPER, background) >= contrast(INK, background) ? PAPER : INK);

// ---------------------------------------------------------------- validation
const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const checkColors = (errors, label, obj, required, optional, opaque) => {
  if (!obj || typeof obj !== 'object') {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const key of required) if (obj[key] === undefined) errors.push(`${label}.${key} is missing`);
  for (const [key, value] of Object.entries(obj)) {
    if (!required.includes(key) && !optional.includes(key)) {
      errors.push(`unknown color "${label}.${key}" (typo? allowed: ${[...required, ...optional].join(', ')})`);
    } else if (!parseColor(value)) {
      errors.push(`${label}.${key} is not a valid color: ${JSON.stringify(value)} (use #rrggbb or rgba(r, g, b, a))`);
    } else if (opaque.includes(key) && parseColor(value).a !== 1) {
      errors.push(`${label}.${key} must be opaque (no alpha)`);
    }
  }
};
const checkIdentity = (errors, def) => {
  if (typeof def.id !== 'string' || !ID.test(def.id)) errors.push(`id must be a lowercase machine id like "midnight" or "deep-sea"`);
  if (typeof def.name !== 'string' || !def.name.trim()) errors.push('name must be a non-empty string');
  if (typeof def.description !== 'string' || !def.description.trim()) errors.push('description must be a non-empty string');
};

/** Returns a list of human-readable problems for a mode definition (empty = valid). */
export function validateMode(def) {
  const errors = [];
  if (!def || typeof def !== 'object') return ['mode definition is not an object'];
  for (const key of Object.keys(def)) if (!MODE_KEYS.includes(key)) errors.push(`unknown field "${key}" (allowed: ${MODE_KEYS.join(', ')})`);
  checkIdentity(errors, def);
  if (!MODES.includes(def.id)) errors.push(`id must be one of: ${MODES.join(', ')}`);
  if (typeof def.shiki !== 'string' || !def.shiki.trim()) errors.push('shiki must name a syntax-highlighting theme');
  checkColors(errors, 'colors', def.colors, MODE_REQUIRED_COLORS, MODE_OPTIONAL_COLORS, MODE_REQUIRED_COLORS.filter((k) => k !== 'border'));
  checkColors(errors, 'code', def.code, CODE_KEYS, [], ['background', 'text']);
  if (errors.length) return errors;

  const c = def.colors;
  const need = (label, fg, bg, min) => {
    const ratio = contrast(fg, bg);
    if (ratio < min) errors.push(`${label} contrast is ${ratio.toFixed(2)}, needs at least ${min}`);
  };
  need('text on background', c.text, c.background, MIN_TEXT_CONTRAST);
  need('textMuted on surface', c.textMuted, c.surface, MIN_TEXT_CONTRAST);
  need('textMuted on background', c.textMuted, c.background, MIN_TEXT_CONTRAST);
  for (const key of ['success', 'warning', 'danger']) need(`${key} on surface`, c[key], c.surface, MIN_TEXT_CONTRAST);
  need('code text on code background', def.code.text, def.code.background, MIN_TEXT_CONTRAST);
  return errors;
}

/** Returns a list of human-readable problems for an accent definition (empty = valid). */
export function validateAccent(def) {
  const errors = [];
  if (!def || typeof def !== 'object') return ['accent definition is not an object'];
  for (const key of Object.keys(def)) if (!ACCENT_KEYS.includes(key)) errors.push(`unknown field "${key}" (allowed: ${ACCENT_KEYS.join(', ')})`);
  checkIdentity(errors, def);
  if (def.aliases !== undefined) {
    if (!Array.isArray(def.aliases) || def.aliases.some((a) => typeof a !== 'string' || !ID.test(a))) {
      errors.push('aliases must be an array of old accent ids');
    }
  }
  if (def.secondary !== undefined) {
    const c = parseColor(def.secondary);
    if (!c) errors.push(`secondary is not a valid color: ${JSON.stringify(def.secondary)} (use #rrggbb)`);
    else if (c.a !== 1) errors.push('secondary must be opaque (no alpha)');
  }
  for (const mode of MODES) {
    checkColors(errors, mode, def[mode], ACCENT_REQUIRED_COLORS, ACCENT_OPTIONAL_COLORS, ['primary', 'primaryHover', 'primaryLight', 'onPrimary']);
  }
  return errors;
}

/** Problems for one mode+accent pair: is the accent readable on this mode's surfaces? (Only call with valid inputs.) */
export function validatePair(mode, accent) {
  const errors = [];
  const c = mode.colors;
  const a = accent[mode.id];
  const label = `accent "${accent.id}" on ${mode.id}`;
  const need = (what, fg, bg, min) => {
    const ratio = contrast(fg, bg);
    if (ratio < min) errors.push(`${label}: ${what} contrast is ${ratio.toFixed(2)}, needs at least ${min}`);
  };
  need('primary on background', a.primary, c.background, MIN_UI_CONTRAST);
  need('primary on surface', a.primary, c.surface, MIN_UI_CONTRAST);
  // primaryLight is the accent used as TEXT (links, active tabs), so it has to meet the text floor.
  need('primaryLight on background', a.primaryLight, c.background, MIN_TEXT_CONTRAST);
  need('primaryLight on surface', a.primaryLight, c.surface, MIN_TEXT_CONTRAST);
  need('text on primary buttons', a.onPrimary ?? readableOn(a.primary), a.primary, MIN_TEXT_CONTRAST);
  return errors;
}

// ---------------------------------------------------------------- derivation
const scaleAlpha = (color, factor) => {
  const c = parseColor(color);
  return toRgba(c, Math.min(1, c.a * factor));
};
// Readable, normalized form of any accepted color (hex stays hex, rgba stays rgba).
const norm = (value) => {
  const c = parseColor(value);
  return c.a === 1 && String(value).trim().startsWith('#') ? toHex(c) : toRgba(c, c.a);
};

/** Mode-level CSS custom properties (name without the leading --). Nothing here depends on the accent. */
export function resolveModeTokens(def) {
  const c = def.colors;
  const d = MODE_DEFAULTS[def.id];
  const dark = def.id === 'dark';

  const success = parseColor(c.success);
  const warning = parseColor(c.warning);
  const danger = parseColor(c.danger);
  const bg = parseColor(c.background);
  const text = parseColor(c.text);
  const accents = {
    cyan: c.cyan ?? d.accents.cyan,
    emerald: c.emerald ?? d.accents.emerald,
    rose: c.rose ?? d.accents.rose,
    amber: c.amber ?? d.accents.amber,
  };
  const shadowRgb = dark ? '0, 0, 0' : toTriplet(text);
  const [aSm, aMd, aLg] = d.shadowAlpha;

  return {
    'bg-primary': norm(c.background),
    'bg-primary-rgb': toTriplet(bg),
    'bg-secondary': norm(c.surfaceAlt),
    'bg-card': norm(c.surface),
    'bg-card-hover': norm(c.surfaceHover ?? mix(c.surface, c.text, 0.05)),
    'bg-elevated': norm(c.elevated ?? mix(c.surface, c.text, 0.12)),

    border: norm(c.border),
    'border-subtle': norm(c.borderSubtle ?? scaleAlpha(c.border, 0.5)),
    'border-strong': norm(c.borderStrong ?? scaleAlpha(c.border, 2)),

    'text-primary': norm(c.text),
    'text-secondary': norm(c.textSecondary ?? mix(c.text, c.textMuted, 0.5)),
    'text-muted': norm(c.textMuted),

    cyan: norm(accents.cyan),
    'cyan-rgb': toTriplet(parseColor(accents.cyan)),
    emerald: norm(accents.emerald),
    rose: norm(accents.rose),
    amber: norm(accents.amber),

    'shadow-sm': `0 1px 3px rgba(${shadowRgb}, ${fmtAlpha(aSm)})`,
    'shadow-md': `0 4px 16px rgba(${shadowRgb}, ${fmtAlpha(aMd)})`,
    'shadow-lg': `0 8px 32px rgba(${shadowRgb}, ${fmtAlpha(aLg)})`,
    'shadow-accent': '0 4px 24px var(--accent-glow)',

    // Two-tone helpers built from variables, so they follow whichever accent and partner colour is active.
    'accent-gradient': 'linear-gradient(135deg, var(--accent), var(--accent-2))',
    'body-glow': `radial-gradient(at 0% 0%, rgba(var(--accent-rgb), ${d.glowAlphas[0]}) 0, transparent 60%), radial-gradient(at 100% 100%, rgba(var(--accent-2-rgb), ${d.glowAlphas[1]}) 0, transparent 55%)`,

    // The semantic status colors from the contract. solved follows success so "done" always looks like "success".
    success: norm(c.success),
    'success-bg': toRgba(success, 0.1),
    warning: norm(c.warning),
    'warning-bg': toRgba(warning, 0.1),
    error: norm(c.danger),
    'error-rgb': toTriplet(danger),
    'error-bg': toRgba(danger, 0.1),
    solved: norm(c.success),
    'solved-bg': toRgba(success, d.statusBgAlpha),

    // Code blocks follow the mode (see the --shiki-* variables that src/styles/global.css maps onto syntax colors).
    'code-bg': norm(def.code.background),
    'code-border': norm(def.code.border),
    'code-text': norm(def.code.text),

    ...(dark ? DARK_TOKENS : LIGHT_TOKENS),
    'theme-scheme': def.id,
  };
}

/** Accent-dependent CSS custom properties for one accent in one mode. */
export function resolveAccentTokens(mode, accent) {
  const a = accent[mode.id];
  const d = MODE_DEFAULTS[mode.id];
  const primary = parseColor(a.primary);
  // The accent's own partner colour; an accent without one falls back to its readable shade so it still has a gradient.
  const partner = parseColor(accent.secondary ?? a.primaryLight);
  return {
    accent: norm(a.primary),
    'accent-hover': norm(a.primaryHover),
    'accent-light': norm(a.primaryLight),
    'accent-subtle': norm(a.primarySubtle ?? toRgba(primary, d.subtleAlpha)),
    'accent-glow': norm(a.primaryGlow ?? toRgba(primary, d.glowAlpha)),
    'accent-rgb': toTriplet(primary),
    'accent-fg': norm(a.onPrimary ?? readableOn(a.primary)),
    'accent-2': toHex(partner),
    'accent-2-rgb': toTriplet(partner),
  };
}

/** The partner-colour override for one accent's secondary (same in both modes). Applied when <html data-secondary> is set. */
export function resolveSecondaryTokens(accent) {
  const partner = parseColor(accent.secondary ?? accent.dark.primaryLight);
  return { 'accent-2': toHex(partner), 'accent-2-rgb': toTriplet(partner) };
}

/** Every token for one mode+accent pair (used by the preview cards and tests). */
export const resolveTokens = (mode, accent) => ({ ...resolveModeTokens(mode), ...resolveAccentTokens(mode, accent) });

// ---------------------------------------------------------------- CSS output
const declarations = (tokens) => Object.entries(tokens).map(([name, value]) => `  --${name}: ${value};`).join('\n');

/**
 * One rule per mode (mode tokens) and one per mode+accent pair (accent tokens). The default mode answers to :root and
 * the default pair to :root too, so the page is never unstyled.
 */
export function buildThemeCss(modes, accents, defaultModeId, defaultAccentId) {
  const blocks = [];
  for (const mode of modes) {
    const selector = mode.id === defaultModeId ? `:root,\nhtml[data-mode='${mode.id}']` : `html[data-mode='${mode.id}']`;
    blocks.push(`/* ${mode.name} mode */\n${selector} {\n${declarations(resolveModeTokens(mode))}\n}`);
  }
  for (const mode of modes) {
    for (const accent of accents) {
      const isDefault = mode.id === defaultModeId && accent.id === defaultAccentId;
      const pair = `html[data-mode='${mode.id}'][data-accent='${accent.id}']`;
      blocks.push(`/* ${accent.name} on ${mode.name} */\n${isDefault ? `:root,\n${pair}` : pair} {\n${declarations(resolveAccentTokens(mode, accent))}\n}`);
    }
  }
  // Partner-colour overrides come last: same specificity as the pair blocks above, so they win when data-secondary is set.
  for (const accent of accents) {
    blocks.push(`/* Partner colour from ${accent.name} */\nhtml[data-accent][data-secondary='${accent.id}'] {\n${declarations(resolveSecondaryTokens(accent))}\n}`);
  }
  return `/* Generated from src/themes/*.js by src/theme/theme-utils.js - edit the theme files, not this output. */\n\n${blocks.join('\n\n')}\n`;
}

/** Short, stable fingerprint used to version the stylesheet URL (FNV-1a, base 36). */
export function fingerprint(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

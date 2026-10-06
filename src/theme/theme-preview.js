// CSS variables for the small preview panel in Settings, read from the SAME resolved tokens the real stylesheet is
// built from. No separate "preview colour" configuration exists, so the panel can never disagree with the real theme.
// The variables are set inline on the panel only, so previewing a draft never touches the rest of the page.
import { resolveTokens } from './theme-utils.js';

const cache = new Map();

/** @returns a style object ({ '--bg-primary': ..., ... }) for one mode + primary + optional secondary (colour defs). */
export function getPreviewVars(mode, accent, secondary = null) {
  const key = `${mode.id}|${accent.id}|${secondary?.id ?? ''}`;
  let vars = cache.get(key);
  if (!vars) {
    vars = Object.freeze(Object.fromEntries(
      Object.entries(resolveTokens(mode, accent, secondary)).map(([name, value]) => [`--${name}`, value]),
    ));
    cache.set(key, vars);
  }
  return vars;
}

/** The shade a colour has in a mode, for swatches: { hex, name }. */
export const swatchHex = (mode, color) => color[mode.id].primary;

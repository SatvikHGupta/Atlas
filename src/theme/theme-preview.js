// CSS variables for the small preview panel in Settings
import { resolveTokens } from './theme-utils.js';

const cache = new Map();

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

// The shade a colour has in a mode, for swatches: { hex, name }
export const swatchHex = (mode, color) => color[mode.id].primary;

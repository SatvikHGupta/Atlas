// Preview colors for a card, read from the SAME resolved tokens the CSS is built from. No separate "preview color"
// configuration exists, so a card can never disagree with the real theme. A preview is always one mode + one accent:
// mode cards show that mode with the visitor's current accent, accent cards show that accent on the current mode,
// both with the visitor's chosen partner colour.
import { resolveTokens, resolveSecondaryTokens } from './theme-utils.js';

const cache = new Map();

export function getThemePreview(mode, accent, partner = null) {
  // partner: the accent whose secondary is the chosen partner colour (null = the accent's own)
  const key = `${mode.id}|${accent.id}|${partner?.id ?? ''}`;
  let preview = cache.get(key);
  if (!preview) {
    const t = resolveTokens(mode, accent);
    preview = Object.freeze({
      bg: t['bg-primary'],
      card: t['bg-card'],
      elevated: t['bg-elevated'],
      text: t['text-primary'],
      muted: t['text-muted'],
      accent: t.accent,
      accentLight: t['accent-light'],
      accentFg: t['accent-fg'],
      solved: t.solved,
      codeBg: t['code-bg'],
      partner: resolveSecondaryTokens(partner ?? accent)['accent-2'],
    });
    cache.set(key, preview);
  }
  return preview;
}

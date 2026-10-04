import { THEME_CSS } from '../../theme/theme-css.js';

// One small static stylesheet with the CSS variables of every registered mode and accent. It is a file (not inlined into each
// page) so ~3,700 prerendered pages do not each carry a copy, and the URL is versioned (?v=hash), hence "immutable".
export const dynamic = 'force-static';

export function GET() {
  return new Response(THEME_CSS, {
    headers: {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

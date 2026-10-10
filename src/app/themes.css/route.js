import { THEME_CSS } from '../../theme/theme-css.js';

export const dynamic = 'force-static';

export function GET() {
  return new Response(THEME_CSS, {
    headers: {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

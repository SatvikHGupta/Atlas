import '../styles/theme.css';
import '../styles/global.css';
import '../styles/typography.css';
import '../styles/animations.css';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import Providers from '../components/layout/Providers.jsx';
import Navbar from '../components/layout/Navbar/Navbar.jsx';
import BottomNav from '../components/layout/BottomNav/BottomNav.jsx';
import ToastContainer from '../components/ui/Toast/ToastContainer.jsx';
import { getDsaIndex, getCpIndex } from '../lib/server/content.server.js';
import { SITE_URL } from '../lib/siteUrl.js';
import { THEME_INIT_SCRIPT } from '../theme/theme-storage.js';
import { THEME_CSS_HREF } from '../theme/theme-css.js';

// BUG FIX: --font-sans/--font-mono in theme.css named these two families from the start, but nothing ever actually loaded them - every page on the site has been silently rendering in the browser's system font this whole time. next/font self-hosts both (no external request, no layout-shift flash) and exposes them as the exact CSS variables theme.css already expects, so this is the only change needed anywhere.
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-sans-loaded',
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono-loaded',
  display: 'swap',
});

// Counts are read from the actual built data, never hand-typed - add a problem, a CP row, whatever, and this line is correct on the next build with no code change. See lib/server/content.server.js.
export function generateMetadata() {
  const dsaCount = getDsaIndex().length;
  const cpCount = getCpIndex().length;
  const total = dsaCount + cpCount;
  const description = `${total.toLocaleString()}+ problems across DSA and competitive programming, with worked explanations, multi-language solutions, and a guided roadmap.`;

  return {
    // every page sets just its own name (e.g. 'Terms') and this template makes it 'Terms | Atlas'; the home page sets { absolute: 'Atlas' }
    title: { default: 'Atlas', template: '%s | Atlas' },
    description,
    metadataBase: new URL(SITE_URL), // SEO-03: same resolver as robots/sitemap/JSON-LD, so every host agrees
    // SEO-01 / ATLAS-BUG-009: './' is only the FALLBACK for private/noindex routes (login, settings...). Every public route sets
    // its own canonical from lib/routeIdentity.js in its own metadata, so twins and ?query variants never rely on this.
    alternates: { canonical: './' },
    manifest: '/site.webmanifest',
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
    openGraph: {
      title: 'Atlas: DSA & Competitive Programming Practice',
      description,
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Atlas: DSA & Competitive Programming Practice',
      description,
      images: ['/og-image.png'],
    },
  };
}

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning: the inline script below sets data-mode and data-accent on <html> before React hydrates, so the
    // attribute is expected to differ from the server HTML. It only silences this one element, not its children.
    <html lang="en" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Both are render-blocking and in <head>: the inline script sets data-mode and data-accent before first paint, the stylesheet carries the CSS variables of every registered mode and accent. (React hoists the precedence link above the script in the output; either order is fine.) */}
        <link rel="stylesheet" href={THEME_CSS_HREF} precedence="themes" />
      </head>
      <body>
        <Providers>
          <Navbar />
          <main>{children}</main>
          <BottomNav />
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}

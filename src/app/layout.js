import '../styles/theme.css';
import '../styles/global.css';
import '../styles/typography.css';
import '../styles/animations.css';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import Providers from '../components/layout/Providers.jsx';
import Navbar from '../components/layout/Navbar/Navbar.jsx';
import BottomNav from '../components/layout/BottomNav/BottomNav.jsx';
import ToastContainer from '../components/ui/Toast/ToastContainer.jsx';
import ThemeColorSync from '../components/layout/ThemeColorSync.jsx';
import ServiceWorkerRegister from '../components/pwa/ServiceWorkerRegister.jsx';
import { getDsaIndex, getCpIndex } from '../lib/server/content.server.js';
import { SITE_URL } from '../lib/siteUrl.js';
import { THEME_INIT_SCRIPT } from '../theme/theme-storage.js';
import { THEME_CSS_HREF } from '../theme/theme-css.js';

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

// Phone viewport: edge-to-edge (safe-area insets become real), zoom stays enabled for accessibility
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1, // pinch-zoom IN stays allowed; zooming OUT below 100% (which exposes side gaps) is not
  viewportFit: 'cover',
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#07070b' },
    { media: '(prefers-color-scheme: light)', color: '#f8f9fb' },
  ],
};

// Counts are read from the actual built data
export function generateMetadata() {
  const dsaCount = getDsaIndex().length;
  const cpCount = getCpIndex().length;
  const total = dsaCount + cpCount;
  const description = `${total.toLocaleString()}+ problems across DSA and competitive programming, with worked explanations, multi-language solutions, and a guided roadmap.`;

  return {
    title: { default: 'Atlas', template: '%s | Atlas' },
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: './' },
    manifest: '/site.webmanifest',
    appleWebApp: { capable: true, title: 'Atlas', statusBarStyle: 'default' },
    formatDetection: { telephone: false },
    other: { 'apple-mobile-web-app-capable': 'yes' }, // Next only writes the newer mobile-web-app-capable tag
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
    <html lang="en" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="stylesheet" href={THEME_CSS_HREF} precedence="themes" />
      </head>
      <body>
        <Providers>
          <Navbar />
          <main>{children}</main>
          <BottomNav />
          <ToastContainer />
          <ThemeColorSync />
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}

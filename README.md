# Atlas

A DSA and competitive programming interview-prep platform built on Next.js. Atlas indexes 3,100+ LeetCode-style problems and 10,500+ Codeforces problems, each with topic tags, difficulty, explanations, and multi-language solutions, alongside company-wise "asked at" question banks, pattern-based practice sets, and a guided roadmap.

Every content page is statically generated at build time from a pre-processed dataset, not fetched and filtered in the browser, which is what makes the site fast and fully indexable by search engines.

## Features

- **Problems** – full DSA problem bank with difficulty, topics, patterns, and syntax-highlighted solutions in JavaScript, Python, C++, and Java, each with a brute-force and optimal variant
- **Competitive Programming** – a separate Codeforces-sourced problem list
- **Companies** – per-company interview pages showing pattern frequency, role-specific guides, and every problem asked there, cross-linked back to each problem's own "Asked at" section
- **Patterns** – technique-based practice sets (two pointers, DP on trees, sliding window, etc.)
- **Notes** – written explanations for core algorithms and patterns
- **Roadmap** – a structured, leveled path through the problem set
- **Accounts** – Google sign-in via Firebase, with solved/bookmarked progress synced per user
- **Dashboard, Bookmarks, History** – personal progress views for signed-in users

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19 |
| Auth & Database | Firebase Auth, Firestore |
| State | Zustand, TanStack Query |
| Code highlighting | Shiki (build-time) |
| Markdown | marked + allowlist sanitizer (`src/lib/sanitizeHtml.js`) |
| Animation | Motion |
| Testing | Vitest |

## Architecture

Content is not fetched from a database or a monolithic JSON blob at request time. It's precomputed once, at build time:

```
raw-data/  (source datasets: problems, company data, tags)
    │
    ▼
scripts/build-content.mjs   — reshapes raw data into per-page bundles
    │
    ▼
content/       — server-only bundles, read by page components at build time
public/data/   — slim indexes, fetched client-side for filtering/search
    │
    ▼
next build   — every page pre-rendered to static HTML
```

This means every problem, company, and pattern page ships as real, pre-rendered HTML with no client-side data fetching required to see content, and page weight stays small because only the code needed for the default view is embedded; alternate solution languages are fetched on demand from a static API route.

## Project Structure

```
atlas/
├── src/
│   ├── app/                 App Router routes — each folder is a real URL
│   │   ├── problems/[slug]/     per-problem SSG page
│   │   ├── companies/[id]/      per-company page
│   │   ├── patterns/[slug]/     per-pattern page
│   │   ├── notes/[slug]/        note reader
│   │   ├── roadmap/[level]/     roadmap levels
│   │   ├── dashboard/ bookmarks/ history/ login/
│   │   ├── api/solutions/[slug]/  lazy-loaded solution variants
│   │   ├── sitemap.js robots.js
│   ├── components/          UI components, grouped by feature
│   ├── services/            Firebase + Firestore integration
│   ├── store/                Zustand stores
│   ├── hooks/                 data + auth hooks
│   ├── lib/
│   │   ├── server/               content.server.js — the only file reading content/ at runtime
│   │   └── ...                     filtering, sorting, structured data helpers
│   └── styles/
├── scripts/
│   ├── build-content.mjs         builds content/ + public/data/ from raw-data/
│   ├── build-companies.mjs       builds raw-data/company-problems/ from company-sources/
│   └── validate-content.mjs      checks every content invariant
├── raw-data/                 source datasets (problems, company sources, tags)
├── content/                  generated at build time, gitignored
├── public/data/               generated at build time, gitignored
└── data/                     small static lookup files (slug redirects, id aliases)
```

## Getting Started

**Prerequisites:** Node.js 20+, a Firebase project with Auth and Firestore enabled.

```bash
git clone <repo-url>
cd atlas
npm install
cp .env.example .env.local
# fill in your Firebase web config in .env.local
npm run build   # builds content from raw-data/, then builds the site
npm start
```

For local development:

```bash
npm run dev
```

> `npm run dev` needs `content/` populated at least once for content pages to render. Run `npm run build:content` after any change to `raw-data/`.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Generate content, then build the production site |
| `npm start` | Serve the production build |
| `npm run build:content` | Regenerate `content/` and `public/data/` from `raw-data/` only |
| `npm run build:companies` | Rebuild `raw-data/company-problems/` from the company sources |
| `npm run validate` | Check every content invariant (counts, links, redirects, roadmap coverage, tags) |
| `npm run lint` | ESLint |
| `npm test` | Run the test suite once (the Firestore rules suite is skipped without the emulator) |
| `npm run test:rules` | Run the Firestore rules tests in the emulator (needs Java and `firebase-tools`) |
| `npm run test:watch` | Run tests in watch mode |

## Environment Variables

See `.env.example`. All Firebase variables are `NEXT_PUBLIC_*` because the Firebase JS SDK is client-side by design; access control is enforced through Firestore security rules, not by hiding these values.

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Cloud Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, used for metadata and sitemap generation |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Optional. reCAPTCHA v3 key that switches Firebase App Check on |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional. Contact address shown on `/privacy` |
| `NEXT_PUBLIC_LOGO_DEV_TOKEN` | Optional. Logo.dev token for company logos |
| `NEXT_PUBLIC_FIREBASE_AUTH_PROXY` | Optional. Set to `1` to proxy Firebase's `/__/auth/*` helper through this site (see below) |

## Themes

A theme is a **mode** plus an **accent** plus a **partner colour**. Settings > Appearance has three sections: Mode (Light
or Dark), Accent (the brand colour) and Partner colour (the second colour in gradients, progress bars, the logo mark and
the second background glow). Every accent works on both modes. The partner is Auto (the accent's own `secondary`) or the
`secondary` of any other accent, so primaries and partners can be mixed and matched freely. Cards are previewed on the
current selections. Code blocks follow the mode (dark page, dark code; light page, light code).

- `src/themes/modes.js` holds the two modes: backgrounds, surfaces, text, borders, status colors and code-block colors.
- `src/themes/<accent>.js` is one accent: `primary`, `primaryHover` and `primaryLight` for `dark` and for `light`, plus an
  optional `secondary` hex (the partner colour, no contrast rule because it is decoration, never text).
- `src/themes/index.js` is the master registry. Nothing else lists modes or accents: the CSS (`/themes.css`), the
  Appearance page and its previews, the pre-paint script that prevents a theme flash, and the saved-value validation
  all read it.

Add an accent:

1. Copy `src/themes/frost.js` to `src/themes/sunset.js` and change `id`, `name`, `description`, `secondary` and the three
   colors for both `dark` and `light`.
2. Import it in `src/themes/index.js` and add it to `ACCENT_DEFINITIONS` (the only edit outside the new file).
3. It appears under Settings > Appearance > Accent. Loading the registry (dev, build, `npm test`) fails if a color is
   invalid or unreadable on either mode: `primary` needs 3:1 against the page, `primaryLight` (the accent used as text
   in links and active tabs) and the text on primary buttons need 4.5:1. In light mode `primaryLight` is therefore a
   darker shade, not a lighter one.

Everything not listed (hover surfaces, glow and subtle tints, shadows, `accent-fg`...) is derived automatically.
Colors in components should always come from tokens (`var(--accent)`, `var(--accent-2)` / `var(--accent-gradient)` for the two-tone look, `rgba(var(--cyan-rgb), 0.1)`,
`rgba(var(--error-rgb), 0.1)`, `var(--shadow-lg)`, `var(--code-bg)`, `hsl(<hue> 70% var(--hue-l))`), never from hex values.

Saved choices live in `localStorage` as `atlas-mode`, `atlas-accent` and `atlas-secondary` (absent means Auto). Visitors who saved a theme before this change
(`atlas-theme`) are migrated once: atlas, ember and meadow become Dark plus that accent, frost and cream become Light plus
that accent, mono becomes Light plus Frost. Keep accent ids stable; to rename or remove one without breaking visitors who
saved it, keep the old id in `aliases: ['old-id']` on the accent that replaces it.

Syntax highlighting is rendered at build time with both palettes (`--shiki-dark` and `--shiki-light`) in every block and
`src/styles/global.css` picks the one that matches the mode, so switching mode recolors code with no rebuild.

## Security notes

- **Headers:** `next.config.mjs` sets nosniff, frame denial, referrer policy, HSTS and a minimal enforced CSP. A fuller CSP ships as `Content-Security-Policy-Report-Only`: watch the browser console for violations before promoting it.
- **Firestore rules:** deploy `firestore.rules` with the app and run `npm run test:rules` first. The rules cap the items map and type-check the profile doc.
- **App Check:** set `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, register the web app under Firebase Console, App Check, then enforce it for Firestore once the metrics look healthy.
- **Sign-in on Safari/Chrome with a custom domain:** popup/redirect sign-in is most reliable when `authDomain` is your own domain. Set `NEXT_PUBLIC_FIREBASE_AUTH_PROXY=1`, set `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` to your site's host, and add `https://<your-host>/__/auth/handler` to the OAuth client's authorised redirect URIs.
- **Privacy:** `/privacy` and `/terms` describe what the code does today. Review them for the regions you serve and update the date when data handling changes.

## Deployment

Atlas is built to deploy on any Node-capable host (Vercel, Railway). `npm run build` must run with network access, since `next/font/google` fetches font files at build time. No other external services are required at build time; `raw-data/` is the only input `build:content` needs.

## License

Author: Satvik Hemant Gupta
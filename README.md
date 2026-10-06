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
scripts/build-content.mjs   - reshapes raw data into per-page bundles
    │
    ▼
content/       - server-only bundles, read by page components at build time
public/data/   - slim indexes, fetched client-side for filtering/search
    │
    ▼
next build   - every page pre-rendered to static HTML
```

This means every problem, company, and pattern page ships as real, pre-rendered HTML with no client-side data fetching required to see content, and page weight stays small because only the code needed for the default view is embedded; alternate solution languages are fetched on demand from a static API route.

## Project Structure

```
atlas/
├── src/
│   ├── app/                 App Router routes - each folder is a real URL
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
│   │   ├── server/               content.server.js - the only file reading content/ at runtime
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

A theme is a **mode** (Dark or Light), a **primary colour** (required) and a **secondary colour** (optional, "None" is
the default). Settings > Appearance is a draft editor: a small preview panel at the top shows all three together, with
Apply, Cancel and Reset to default under it, then three sections of small cards (a colour square, the colour's name and
its hex). Nothing changes in the real app until Apply; Cancel drops the draft; Reset to default only fills the draft
with the defaults (Dark, Atlas, no secondary), Apply still has to be pressed. Choices are saved on this device only.

- Primary colour: buttons, links, focus rings, active tabs.
- Secondary colour: gradients, progress bars, the logo mark and the second background glow. With None everything is
  single-colour (the gradient is flat).
- Code blocks follow the mode (dark page, dark code; light page, light code).

The files:

- `src/themes/modes.js` holds the two modes: backgrounds, surfaces, text, borders, status colours and code-block colours.
- `src/themes/colors.js` is the one palette, 16 colours (8 basic, 8 extra), each with a shade per mode. Primary and
  secondary are both picked from it, so every colour can be either. The secondary uses the colour's `primary` shade
  for the current mode.
- `src/themes/index.js` is the master registry. Nothing else lists modes or colours: the CSS (`/themes.css`), the
  Appearance page and its preview, the pre-paint script that prevents a theme flash, and the saved-value validation all
  read it.

Add a colour: open `src/themes/colors.js`, copy an entry, change `id`, `name`, `group` and the six shades (`primary`,
`hover`, `link` for `dark` and for `light`). It appears as a primary and as a secondary option. Loading the registry
(dev, build, `npm test`) fails if a shade is unreadable on either mode: `primary` needs 3:1 against the page, `link` (the
colour used as text in links and active tabs) and the text on primary buttons need 4.5:1. In light mode `link` is
therefore a darker shade, not a lighter one. The secondary is decoration, so it has no contrast rule.

Everything not listed (hover surfaces, glow and subtle tints, shadows, `accent-fg`...) is derived automatically.
Colours in components should always come from tokens (`var(--accent)`, `var(--accent-2)` / `var(--accent-gradient)` for
the two-tone look, `rgba(var(--cyan-rgb), 0.1)`, `rgba(var(--error-rgb), 0.1)`, `var(--shadow-lg)`, `var(--code-bg)`,
`hsl(<hue> 70% var(--hue-l))`), never from hex values.

Saved choices live in `localStorage` as `atlas-mode`, `atlas-accent` (the primary colour id) and `atlas-secondary` (the
secondary colour id; absent means none). Values saved by earlier versions are migrated on read: old accent ids map to
the closest colour through each colour's `aliases` (for example `synthwave` to Pink, `toxic` to Acid Lime, `frost` and
`mono` to Blue), and the original single `atlas-theme` value maps to a mode plus a colour. Keep colour ids stable; to
rename or remove one, keep the old id in `aliases: ['old-id']` on the colour that replaces it.

Syntax highlighting is rendered at build time with both palettes (`--shiki-dark` and `--shiki-light`) in every block and
`src/styles/global.css` picks the one that matches the mode, so switching mode recolours code with no rebuild.

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
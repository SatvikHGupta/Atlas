# Atlas

Atlas is a DSA and competitive programming interview-preparation platform built with **Next.js**.

It contains **3,100+ LeetCode-style problems** and **10,500+ Codeforces problems**, with topic tags, difficulty, explanations, multi-language solutions, company-wise interview questions, pattern-based practice, notes, and a guided roadmap.

Content is pre-processed and generated at build time, allowing Atlas pages to be served as pre-rendered HTML instead of loading the full dataset in the browser.

---

## Features

- **Problems** - DSA problems with difficulty, topics, patterns, explanations, and solutions in JavaScript, Python, C++, and Java.
- **Competitive Programming** - Codeforces problem collection.
- **Companies** - Company-wise interview questions and patterns.
- **Patterns** - Pattern-based practice sets.
- **Notes** - Algorithm and DSA explanations.
- **Roadmap** - Structured learning path.
- **Accounts** - Google sign-in with Firebase.
- **Progress** - Dashboard, bookmarks, and history.
- **PWA** - Installable app experience with optional offline support.
- **Mobile UI** - Responsive phone layout with bottom navigation and mobile sheets.

---

## Tech Stack

| Area | Technology |
|---|---|
| Framework | Next.js 16, React 19 |
| Authentication & Database | Firebase Auth, Firestore |
| State | Zustand, TanStack Query |
| Code Highlighting | Shiki |
| Markdown | marked + sanitizer |
| Animation | Motion |
| Testing | Vitest |
| PWA | Web Manifest + Service Worker |

---

## Architecture

Atlas uses a build-time content pipeline.

```text
raw-data/
    │
    ▼
scripts/build-content.mjs
    │
    ├──► content/
    │    Server-side page data
    │
    └──► public/data/
         Client-side indexes
              │
              ▼
          next build
              │
              ▼
       Pre-rendered pages
```

The main source datasets live in `raw-data/`.

`scripts/build-content.mjs` converts them into the generated `content/` and `public/data/` structures used by the application.

This keeps large datasets out of the browser while allowing pages to be statically generated and indexed by search engines.

---

## Project Structure

```text
atlas/
├── src/
│   ├── app/              # Next.js routes
│   ├── components/       # UI components
│   ├── hooks/            # React hooks
│   ├── lib/              # Utilities and helpers
│   ├── services/         # Firebase / Firestore
│   ├── store/            # Zustand state
│   ├── styles/           # Global styles
│   └── themes/           # Theme system
│
├── scripts/
│   ├── build-content.mjs
│   ├── build-companies.mjs
│   └── validate-content.mjs
│
├── raw-data/             # Source datasets
├── content/              # Generated build-time content
├── public/
│   ├── data/             # Generated client indexes
│   ├── site.webmanifest
│   ├── sw.js
│   ├── sw-config.json
│   ├── offline.html
│   └── icon-*.png
│
├── data/                 # Static lookup data
└── .env.example
```

`content/` and `public/data/` are generated during the build process.

---

## Getting Started

### Requirements

- Node.js 20+
- Firebase project
- Firebase Authentication enabled
- Firestore enabled

### Installation

```bash
git clone <repo-url>
cd atlas
npm install
cp .env.example .env.local
```

Configure the required environment variables in `.env.local`.

Build Atlas:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

### Development

```bash
npm run dev
```

If `content/` has not been generated yet, run:

```bash
npm run build:content
```

Run this again whenever the source data in `raw-data/` changes.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build content and production application |
| `npm start` | Start production server |
| `npm run build:content` | Regenerate content and client indexes |
| `npm run build:companies` | Rebuild company problem data |
| `npm run validate` | Validate generated content |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run test:rules` | Run Firestore rules tests |
| `npm run test:watch` | Run tests in watch mode |

---

## Environment Variables

See `.env.example` for the complete configuration.

### Required

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase application ID |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |

### Optional

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Enables Firebase App Check with reCAPTCHA v3 |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Contact address shown on `/privacy` |
| `NEXT_PUBLIC_LOGO_DEV_TOKEN` | Logo.dev token for company logos |
| `NEXT_PUBLIC_FIREBASE_AUTH_PROXY` | Set to `1` for Firebase auth proxy support |
| `NEXT_PUBLIC_ENABLE_SW` | Set to `1` to enable the service worker |

---

# Mobile & PWA

Atlas uses the same codebase on desktop and mobile. There is no separate mobile application or mobile codebase.

Phone-specific UI starts at **768px**.

### Main mobile files

| Area | Location |
|---|---|
| Responsive phone detection | `src/hooks/useIsPhone.js` |
| Bottom navigation | `src/components/layout/BottomNav/` |
| Bottom sheets | `src/components/ui/BottomSheet/` |
| Filter sheets | `src/components/ui/FilterDrawer/` |
| Install prompt | `src/hooks/useInstallPrompt.js` |
| PWA utilities | `src/lib/pwa.js` |
| Service worker | `public/sw.js` |
| Offline page | `public/offline.html` |
| Manifest | `public/site.webmanifest` |
| App icons | `public/icon-*.png` |
| Post-card sharing | `src/lib/postCardDownload.js` |

---

## Service Worker

The service worker is disabled by default.

Enable it with:

```env
NEXT_PUBLIC_ENABLE_SW=1
```

After setting the variable, redeploy the application.

Service workers require **HTTPS**. Use a Vercel deployment, HTTPS tunnel, or:

```bash
next dev --experimental-https
```

### Testing Offline Support

1. Enable the service worker.
2. Open Atlas over HTTPS.
3. Visit several pages.
4. Enable airplane mode.
5. Reopen Atlas.
6. Verify cached pages and the offline page.

### Disabling the Service Worker

Either remove:

```env
NEXT_PUBLIC_ENABLE_SW
```

or set:

```json
{
  "disabled": true
}
```

in:

```text
public/sw-config.json
```

### Updating Caches

When changing cached resources or service-worker behavior, bump `VERSION` in:

```text
public/sw.js
```

Users will receive the new version through Atlas's update prompt.

---

## Mobile Authentication

Some mobile environments cannot reliably use authentication popups, including installed iOS PWAs and many in-app browsers.

Atlas therefore uses redirect authentication where required.

For custom domains and Safari, configure:

```env
NEXT_PUBLIC_FIREBASE_AUTH_PROXY=1
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-domain>
```

The OAuth redirect URI should include:

```text
https://<your-domain>/_/auth/handler
```

---

# Themes

Atlas supports **Dark** and **Light** modes with configurable primary and optional secondary colours.

The theme system is centralized in:

```text
src/themes/
├── modes.js
├── colors.js
└── index.js
```

`index.js` acts as the master registry used by the theme system and Appearance settings.

Theme selections are stored locally using:

```text
atlas-mode
atlas-accent
atlas-secondary
```

Components should use theme tokens such as:

```css
var(--accent)
var(--accent-2)
var(--accent-gradient)
var(--code-bg)
var(--shadow-lg)
```

rather than hard-coded colour values.

Code highlighting supports both theme modes through build-time Shiki palettes, allowing code blocks to change with the active theme without rebuilding.

---

# Security

Atlas includes security headers through `next.config.mjs`, including:

- HSTS
- Referrer Policy
- `X-Content-Type-Options`
- Frame protection
- Content Security Policy

Firestore access is controlled through `firestore.rules`.

Before deploying Firestore rule changes:

```bash
npm run test:rules
```

Firebase App Check can optionally be enabled using:

```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<your-key>
```

Review `/privacy` and `/terms` whenever application data handling changes.

---

# Deployment

Atlas can be deployed to any Node.js-compatible hosting platform.

For production:

```bash
npm run build
npm start
```

The build requires network access because `next/font/google` downloads fonts during the build.

Vercel is supported and works well with the Next.js application and PWA setup.

---

# Testing

Run the main test suite:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

Validate generated content:

```bash
npm run validate
```

For Firestore rules:

```bash
npm run test:rules
```

For mobile changes, also test the application using **Lighthouse Mobile** and a real Android/iOS device where possible.

---

# License

See the repository for licensing information.

**Author:** Satvik Hemant Gupta
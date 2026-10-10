// Atlas service worker: offline reading for pages you have visited. Author: Satvik Hemant Gupta
// Bump VERSION to drop every cache on the next update.
const VERSION = 'v1';
const CACHES = {
  shell: `atlas-shell-${VERSION}`,
  static: `atlas-static-${VERSION}`,
  data: `atlas-data-${VERSION}`,
  solutions: `atlas-solutions-${VERSION}`,
  pages: `atlas-pages-${VERSION}`,
};
const OFFLINE_URL = '/offline.html';
const SHELL = [OFFLINE_URL, '/site.webmanifest', '/icon-192.png', '/icon-512.png', '/favicon.svg'];
const LIMITS = { pages: 150, solutions: 300, data: 6, static: 400 };
const NAV_TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  // no skipWaiting: a new version waits until the page asks for it
  event.waitUntil(caches.open(CACHES.shell).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set(Object.values(CACHES));
    for (const name of await caches.keys()) if (name.startsWith('atlas-') && !keep.has(name)) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'SKIP_WAITING') self.skipWaiting();
  if (msg.type === 'CACHE_URL' && typeof msg.url === 'string') event.waitUntil(capturePage(msg.url));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;              // Firebase, Google, Logo.dev: always the network
  const p = url.pathname;
  if (p.startsWith('/__/') || p === '/sw.js' || p === '/sw-config.json') return;
  if (req.headers.get('RSC') || url.searchParams.has('_rsc')) return; // Next's own navigation payloads

  if (p.startsWith('/_next/static/')) return event.respondWith(cacheFirst(CACHES.static, req, LIMITS.static));
  if (p.startsWith('/data/')) return event.respondWith(staleWhileRevalidate(CACHES.data, req, LIMITS.data));
  if (p.startsWith('/api/solutions/')) return event.respondWith(staleWhileRevalidate(CACHES.solutions, req, LIMITS.solutions));
  if (req.mode === 'navigate') return event.respondWith(networkFirstPage(event));
  if (/\.(?:png|svg|webp|ico|woff2?)$/.test(p)) return event.respondWith(staleWhileRevalidate(CACHES.static, req, LIMITS.static));
});

const pageKey = (url) => { const u = new URL(url, self.location.origin); return new Request(u.origin + u.pathname); }; // one entry per path, query ignored
const isHtml = (res) => (res.headers.get('content-type') || '').includes('text/html');

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(name, req, max) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) { await cache.put(req, res.clone()); trim(cache, max); }
  return res;
}

async function staleWhileRevalidate(name, req, max) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const refresh = fetch(req).then((res) => {
    if (res.ok) { cache.put(req, res.clone()).then(() => trim(cache, max)); }
    return res;
  });
  if (hit) { refresh.catch(() => {}); return hit; }
  return refresh;
}

async function networkFirstPage(event) {
  const req = event.request;
  const cache = await caches.open(CACHES.pages);
  const key = pageKey(req.url);
  const net = fetch(req).then((res) => {
    if (res.ok && !res.redirected && isHtml(res)) event.waitUntil(cache.put(key, res.clone()).then(() => trim(cache, LIMITS.pages)));
    return res;
  });
  const quiet = net.catch(() => null);
  const slow = new Promise((resolve) => setTimeout(() => resolve('slow'), NAV_TIMEOUT_MS));
  try {
    const first = await Promise.race([net, slow]);
    if (first !== 'slow') return first;
    const cached = await cache.match(key);
    if (cached) return cached;
    const late = await quiet;
    if (late) return late;
  } catch (err) { /* offline: fall through to the cache */ }
  return (await cache.match(key)) || (await caches.match(OFFLINE_URL)) || Response.error();
}

async function capturePage(rawUrl) {
  try {
    const url = new URL(rawUrl, self.location.origin);
    if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/__/')) return;
    const res = await fetch(url.pathname, { credentials: 'same-origin', headers: { Accept: 'text/html' } });
    if (!res.ok || res.redirected || !isHtml(res)) return;
    const cache = await caches.open(CACHES.pages);
    await cache.put(pageKey(url.pathname), res);
    await trim(cache, LIMITS.pages);
  } catch (err) { /* offline or blocked: nothing to save */ }
}

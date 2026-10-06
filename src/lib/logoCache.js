// Remembers company logos in the visitor's own browser (localStorage) so Logo.dev is asked for each logo once per
// visitor, not once per 24 hours. Logo.dev's responses carry "Access-Control-Allow-Origin: *", which is what lets a
// canvas read the pixels back out. If anything here fails the badge falls back to a plain <img>, nothing breaks.
// Author: Satvik Hemant Gupta

const PREFIX = 'atlas-logo:v1:';

// CHANGE THIS: how long a saved logo is trusted. Infinity = until the visitor clears site data.
// Logo.dev's own docs describe long-term storage as a licensed feature (Pro and Enterprise plans), so on a free
// plan a finite value such as 30 * 24 * 60 * 60 * 1000 keeps you closer to their normal 24-hour browser caching.
export const LOGO_TTL_MS = Infinity;

const MAX_PX = 256;        // never store anything bigger than this
const LOAD_TIMEOUT_MS = 6000;

export function readCachedLogo(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { u, t } = JSON.parse(raw);
    if (typeof u !== 'string' || !u.startsWith('data:image/')) return null;
    if (Date.now() - t > LOGO_TTL_MS) { localStorage.removeItem(PREFIX + key); return null; }
    return u;
  } catch {
    return null; // storage blocked or corrupt entry: behave as if nothing is saved
  }
}

export function writeCachedLogo(key, dataUrl) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ u: dataUrl, t: Date.now() }));
  } catch {
    /* storage full or blocked: the logo still shows, it just is not remembered */
  }
}

/** Loads an image URL in CORS mode and returns it as a PNG data URL, or null on any failure (blocked, slow, no CORS). */
export function loadLogoDataUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
    img.crossOrigin = 'anonymous'; // without this the canvas is tainted and toDataURL() throws
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      clearTimeout(timer);
      try {
        const w = Math.min(img.naturalWidth || 0, MAX_PX), h = Math.min(img.naturalHeight || 0, MAX_PX);
        if (!w || !h) return resolve(null);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });
}

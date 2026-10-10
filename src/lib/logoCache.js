// Remembers company logos in the visitor's own browser. Author: Satvik Hemant Gupta

const PREFIX = 'atlas-logo:v1:';

// how long a saved logo is trusted
export const LOGO_TTL_MS = Infinity;

const MAX_PX = 256;
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
    return null;
  }
}

export function writeCachedLogo(key, dataUrl) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ u: dataUrl, t: Date.now() }));
  } catch {
  }
}

// Loads an image URL in CORS mode and returns it as a PNG data URL
export function loadLogoDataUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
    img.crossOrigin = 'anonymous';
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

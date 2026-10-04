// The one live "active theme" (mode + accent) for the browser. The DOM attributes <html data-mode data-accent> are the
// source of truth (what the CSS reads and what the init script sets before paint); localStorage holds the two ids
// between visits; React reads the store through useSyncExternalStore. All three are kept in step here.
import {
  MODE_IDS, ACCENT_IDS, DEFAULT_MODE_ID, DEFAULT_ACCENT_ID, parseModeId, parseAccentId, resolveTheme,
} from '../themes/index.js';
import { MODE_STORAGE_KEY, ACCENT_STORAGE_KEY, SECONDARY_STORAGE_KEY, LEGACY_STORAGE_KEY } from './theme-storage.js';

/**
 * @param {{doc?: Document, storage?: Storage, win?: Window, defaultMode?: string, defaultAccent?: string,
 *          keys?: {mode: string, accent: string, secondary: string, legacy: string}}} [env] everything is injectable so tests need no browser
 */
export function createThemeStore({
  doc = typeof document !== 'undefined' ? document : null,
  storage = null,
  win = typeof window !== 'undefined' ? window : null,
  defaultMode = DEFAULT_MODE_ID,
  defaultAccent = DEFAULT_ACCENT_ID,
  keys = { mode: MODE_STORAGE_KEY, accent: ACCENT_STORAGE_KEY, secondary: SECONDARY_STORAGE_KEY, legacy: LEGACY_STORAGE_KEY },
} = {}) {
  const listeners = new Set();
  const notify = () => listeners.forEach((listener) => listener());

  const getStorage = () => {
    try {
      return storage ?? win?.localStorage ?? null;
    } catch {
      return null; // some browsers throw on access when storage is blocked
    }
  };
  const read = (key) => {
    try {
      return getStorage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  };
  const write = (key, value) => {
    try {
      getStorage()?.setItem(key, value);
    } catch {
      // Private mode / quota: the theme still applies for this session through the DOM attributes.
    }
  };
  const remove = (key) => {
    try {
      getStorage()?.removeItem(key);
    } catch {
      // nothing to do
    }
  };
  const attr = (name) => doc?.documentElement.getAttribute(name) ?? null;
  const applyMode = (id) => doc?.documentElement.setAttribute('data-mode', id);
  const applyAccent = (id) => doc?.documentElement.setAttribute('data-accent', id);
  const applySecondary = (id) => {
    if (id) doc?.documentElement.setAttribute('data-secondary', id);
    else doc?.documentElement.removeAttribute('data-secondary');
  };

  // useSyncExternalStore needs the same object back while nothing changed, so snapshots are cached per pair.
  const snapshots = new Map();
  const snapshotFor = (mode, accent, secondary) => {
    const key = `${mode}|${accent}|${secondary ?? ''}`;
    if (!snapshots.has(key)) snapshots.set(key, Object.freeze({ mode, accent, secondary }));
    return snapshots.get(key);
  };
  const getSnapshot = () => snapshotFor(
    parseModeId(attr('data-mode')) ?? defaultMode,
    parseAccentId(attr('data-accent')) ?? defaultAccent,
    parseAccentId(attr('data-secondary')),
  );
  // Server render and the hydration pass always see the default, React then re-renders with the real value.
  const getServerSnapshot = () => snapshotFor(defaultMode, defaultAccent, null);

  function onStorage(event) {
    if (event.key !== keys.mode && event.key !== keys.accent && event.key !== keys.secondary) return; // another tab changed the theme
    const next = resolveTheme({ mode: read(keys.mode), accent: read(keys.accent), secondary: read(keys.secondary) });
    applyMode(next.mode);
    applyAccent(next.accent);
    applySecondary(next.secondary);
    notify();
  }

  function subscribe(listener) {
    listeners.add(listener);
    if (listeners.size === 1) win?.addEventListener?.('storage', onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) win?.removeEventListener?.('storage', onStorage);
    };
  }

  /** Select a mode: validate, apply immediately, persist the id only. Returns false for an unknown id. */
  function setMode(id) {
    if (!MODE_IDS.includes(id)) return false;
    applyMode(id);
    write(keys.mode, id);
    notify();
    return true;
  }

  /** Select an accent: validate, apply immediately, persist the id only. Returns false for an unknown id. */
  function setAccent(id) {
    if (!ACCENT_IDS.includes(id)) return false;
    applyAccent(id);
    write(keys.accent, id);
    notify();
    return true;
  }

  /** Select a partner colour (an accent id), or null for Auto. Validate, apply, persist. Returns false for an unknown id. */
  function setSecondary(id) {
    if (id !== null && !ACCENT_IDS.includes(id)) return false;
    applySecondary(id);
    if (id === null) remove(keys.secondary);
    else write(keys.secondary, id);
    notify();
    return true;
  }

  /**
   * Re-assert the invariant after hydration: DOM === resolved stored theme, and a stale stored value (removed accent,
   * old alias, garbage, the pre-accent single "atlas-theme") is repaired. A no-op when everything already agrees.
   */
  function sync() {
    const storedMode = read(keys.mode);
    const storedAccent = read(keys.accent);
    const storedSecondary = read(keys.secondary);
    const legacy = read(keys.legacy);
    const next = resolveTheme({ mode: storedMode, accent: storedAccent, secondary: storedSecondary, legacy });
    if (attr('data-mode') !== next.mode) applyMode(next.mode);
    if (attr('data-accent') !== next.accent) applyAccent(next.accent);
    if (attr('data-secondary') !== next.secondary) applySecondary(next.secondary);
    if (storedSecondary !== null && storedSecondary !== next.secondary) {
      if (next.secondary) write(keys.secondary, next.secondary);
      else remove(keys.secondary);
    }
    if ((storedMode !== null || legacy !== null) && storedMode !== next.mode) write(keys.mode, next.mode);
    if ((storedAccent !== null || legacy !== null) && storedAccent !== next.accent) write(keys.accent, next.accent);
    if (legacy !== null) remove(keys.legacy);
    notify();
    return next;
  }

  return { subscribe, getSnapshot, getServerSnapshot, setMode, setAccent, setSecondary, sync };
}

let singleton = null;
/** The app-wide store (browser only). */
export function getThemeStore() {
  if (!singleton) singleton = createThemeStore();
  return singleton;
}

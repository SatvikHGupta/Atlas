// The one live "active theme" (mode + accent) for the browser
import {
  MODE_IDS, COLOR_IDS, DEFAULT_MODE_ID, DEFAULT_ACCENT_ID, parseModeId, parseColorId, resolveTheme,
} from '../themes/index.js';
import { MODE_STORAGE_KEY, ACCENT_STORAGE_KEY, SECONDARY_STORAGE_KEY, LEGACY_STORAGE_KEY } from './theme-storage.js';

// keys?: {mode: string, accent
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
      return null;
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
    }
  };
  const remove = (key) => {
    try {
      getStorage()?.removeItem(key);
    } catch {
    }
  };
  const attr = (name) => doc?.documentElement.getAttribute(name) ?? null;
  const applyMode = (id) => doc?.documentElement.setAttribute('data-mode', id);
  const applyAccent = (id) => doc?.documentElement.setAttribute('data-accent', id);
  const applySecondary = (id) => {
    if (id) doc?.documentElement.setAttribute('data-secondary', id);
    else doc?.documentElement.removeAttribute('data-secondary');
  };

  const snapshots = new Map();
  const snapshotFor = (mode, accent, secondary) => {
    const key = `${mode}|${accent}|${secondary ?? ''}`;
    if (!snapshots.has(key)) snapshots.set(key, Object.freeze({ mode, accent, secondary }));
    return snapshots.get(key);
  };
  const getSnapshot = () => snapshotFor(
    parseModeId(attr('data-mode')) ?? defaultMode,
    parseColorId(attr('data-accent')) ?? defaultAccent,
    parseColorId(attr('data-secondary')),
  );
  const getServerSnapshot = () => snapshotFor(defaultMode, defaultAccent, null);

  function onStorage(event) {
    if (event.key !== keys.mode && event.key !== keys.accent && event.key !== keys.secondary) return;
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

  function setMode(id) {
    if (!MODE_IDS.includes(id)) return false;
    applyMode(id);
    write(keys.mode, id);
    notify();
    return true;
  }

  function setAccent(id) {
    if (!COLOR_IDS.includes(id)) return false;
    applyAccent(id);
    write(keys.accent, id);
    notify();
    return true;
  }

  function setSecondary(id) {
    if (id !== null && !COLOR_IDS.includes(id)) return false;
    applySecondary(id);
    if (id === null) remove(keys.secondary);
    else write(keys.secondary, id);
    notify();
    return true;
  }

  function apply(next) {
    const mode = parseModeId(next?.mode);
    const accent = parseColorId(next?.accent);
    const secondary = next?.secondary == null ? null : parseColorId(next.secondary);
    if (!mode || !accent || (next?.secondary != null && !secondary)) return false;
    applyMode(mode);
    applyAccent(accent);
    applySecondary(secondary);
    write(keys.mode, mode);
    write(keys.accent, accent);
    if (secondary) write(keys.secondary, secondary);
    else remove(keys.secondary);
    notify();
    return true;
  }

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

  return { subscribe, getSnapshot, getServerSnapshot, setMode, setAccent, setSecondary, apply, sync };
}

let singleton = null;
// The app-wide store (browser only)
export function getThemeStore() {
  if (!singleton) singleton = createThemeStore();
  return singleton;
}

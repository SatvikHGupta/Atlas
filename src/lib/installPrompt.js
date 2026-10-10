// Holds Chrome's "install app" event until the user taps Install. Author: Satvik Hemant Gupta
let deferred = null;
let started = false;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

// Call once on the client; the event can fire before any component mounts
export function initInstallCapture() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; emit(); });
}

export const subscribeInstall = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const getInstallEvent = () => deferred;
export const getServerInstallEvent = () => null;

// Resolves 'accepted', 'dismissed' or 'unavailable'
export async function promptInstall() {
  const e = deferred;
  if (!e) return 'unavailable';
  deferred = null;
  emit();
  e.prompt();
  try { return (await e.userChoice).outcome; } catch { return 'dismissed'; }
}

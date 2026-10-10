'use client';

// Registers the service worker, shows "update ready" and "offline" notices, and saves visited pages
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { initInstallCapture } from '../../lib/installPrompt.js';
import styles from './PwaBanners.module.css';

// Off unless NEXT_PUBLIC_ENABLE_SW=1, so the service worker can be switched on per deployment
const ENABLED = process.env.NEXT_PUBLIC_ENABLE_SW === '1';

async function unregisterAll() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  if (typeof caches !== 'undefined') {
    for (const name of await caches.keys()) if (name.startsWith('atlas-')) await caches.delete(name);
  }
}

// Remote switch: { "disabled": true } in public/sw-config.json removes the worker for everyone
async function isKilled() {
  try {
    const res = await fetch('/sw-config.json', { cache: 'no-store' });
    return res.ok && (await res.json()).disabled === true;
  } catch {
    return false;
  }
}

function subscribeOnline(cb) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); };
}

export default function ServiceWorkerRegister() {
  const pathname = usePathname();
  const [waiting, setWaiting] = useState(null);
  const offline = useSyncExternalStore(subscribeOnline, () => !navigator.onLine, () => false);
  const reloading = useRef(false);

  useEffect(() => { initInstallCapture(); }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    let cancelled = false;

    const onControllerChange = () => {
      if (reloading.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    (async () => {
      if (!ENABLED || (await isKilled())) { await unregisterAll(); return; }
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
        if (cancelled) return;
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(worker);
          });
        });
      } catch {
        /* registration can fail on http or in private modes; the site works without it */
      }
    })();

    return () => { cancelled = true; navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange); };
  }, []);

  // keep a copy of every page the visitor opens, so it works offline later
  useEffect(() => {
    if (!ENABLED || !('serviceWorker' in navigator) || navigator.connection?.saveData) return undefined;
    const t = setTimeout(() => {
      navigator.serviceWorker.controller?.postMessage({ type: 'CACHE_URL', url: window.location.pathname });
    }, 1500);
    return () => clearTimeout(t);
  }, [pathname]);

  const applyUpdate = () => {
    reloading.current = true;
    waiting?.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <>
      {offline && <div className={styles.offline} role="status">You are offline. Saved pages still work.</div>}
      {waiting && (
        <div className={styles.update} role="status">
          <span>A new version is ready</span>
          <button type="button" onClick={applyUpdate}>Update</button>
        </div>
      )}
    </>
  );
}

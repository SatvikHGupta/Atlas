'use client';

import { useSyncExternalStore } from 'react';
import { readDocumentChartTheme } from './chartTheme.js';

let cached = null;
let cachedSignature = '';

function snapshot() {
  const next = readDocumentChartTheme();
  const signature = JSON.stringify(next);
  if (signature !== cachedSignature) {
    cachedSignature = signature;
    cached = next;
  }
  return cached;
}

function subscribe(callback) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode', 'data-accent', 'data-theme', 'class', 'style'] });
  return () => observer.disconnect();
}

// null on the server and during hydration, the live theme afterwards
export function useChartTheme() {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

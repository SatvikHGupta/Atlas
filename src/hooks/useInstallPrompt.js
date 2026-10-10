'use client';
// What the Install row in the More menu should do on this device. Author: Satvik Hemant Gupta
import { useSyncExternalStore } from 'react';
import { subscribeInstall, getInstallEvent, getServerInstallEvent, promptInstall } from '../lib/installPrompt.js';
import { canShowIosInstallGuide, isStandalone } from '../lib/pwa.js';

const noSubscribe = () => () => {};

export function useInstallPrompt() {
  const event = useSyncExternalStore(subscribeInstall, getInstallEvent, getServerInstallEvent);
  // these never change while the page is open, and the server snapshot keeps hydration matching
  const standalone = useSyncExternalStore(noSubscribe, () => isStandalone(), () => false);
  const iosGuide = useSyncExternalStore(noSubscribe, () => canShowIosInstallGuide(), () => false);

  return { canPrompt: !!event && !standalone, iosGuide, standalone, install: promptInstall };
}

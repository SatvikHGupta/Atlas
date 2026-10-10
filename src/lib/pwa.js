// Small browser checks for installed-app and in-app-browser behaviour. Author: Satvik Hemant Gupta

const IN_APP = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|LinkedInApp|Snapchat|musical_ly/i;

export function isInAppBrowser(ua = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  return IN_APP.test(ua || '');
}

export function isIosDevice(nav = typeof navigator !== 'undefined' ? navigator : null) {
  if (!nav) return false;
  const ua = nav.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1; // iPadOS reports itself as a Mac
}

// True when launched from the Home Screen / app drawer rather than a browser tab
export function isStandalone(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return false;
  if (win.navigator?.standalone === true) return true;
  try { return !!win.matchMedia?.('(display-mode: standalone)').matches; } catch { return false; }
}

// iPhone or iPad in a normal browser tab, where "Add to Home Screen" is the only way to install
export function canShowIosInstallGuide(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return false;
  return isIosDevice(win.navigator) && !isStandalone(win) && !isInAppBrowser(win.navigator?.userAgent);
}

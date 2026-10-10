'use client';

// Keeps the browser bar colour in step with Atlas's own dark/light mode, not just the OS setting
import { useEffect } from 'react';
import { useThemePreference } from '../../hooks/useThemePreference.js';

export default function ThemeColorSync() {
  const { mode, accent, secondary } = useThemePreference();

  useEffect(() => {
    // runs after data-mode is applied, so the computed background is already the right one
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim();
    if (!bg) return;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg));
  }, [mode, accent, secondary]);

  return null;
}

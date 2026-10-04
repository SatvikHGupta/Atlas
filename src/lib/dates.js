// Local-calendar date helpers (client use). Author: Satvik Hemant Gupta
// READ-ONLY shared file: every handoff gets an identical copy. Do not edit.

// "2026-09-27" for the viewer's LOCAL calendar day (not UTC).
export function localDateKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(now = new Date()) {
  return localDateKey(now);
}

// Add n calendar days to a "YYYY-MM-DD" key (DST safe: uses local Y/M/D).
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return localDateKey(new Date(y, m - 1, d + n));
}

// Whole calendar days from key a to key b (b - a).
export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return Math.round(ms / 86400000);
}

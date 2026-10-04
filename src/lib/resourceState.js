// ATLAS-BUG-002/003: explicit resource-state contract for personal data (progress, bookmarks). Pure, no store imports.
// Author: Satvik Hemant Gupta
//
// A personal resource is in exactly ONE of four states:
//   'signed-out' no user, nothing to load
//   'loading'    signed in, first read not finished
//   'failed'     signed in, the read FAILED  <- must never be shown as "empty"
//   'ready'      loaded (an empty map here really means "nothing saved")
// Every consumer has to branch on this, never on `items.length === 0`.
import { statusNeeds } from './authGate.js';

export function resourceState({ authed, ready, failed }) {
  if (!authed) return 'signed-out';
  if (failed) return 'failed';
  if (!ready) return 'loading';
  return 'ready';
}

/**
 * Can the status filter / personal controls be trusted right now?
 * @param {string} status               active status filter ('' for none)
 * @param {string} progressState        resourceState() of progress
 * @param {string} bookmarksState       resourceState() of bookmarks
 * @returns {'ok'|'loading'|'failed'}   'failed' wins over 'loading'; only the resources the filter needs are considered
 */
export function personalGate(status, progressState, bookmarksState) {
  const needs = statusNeeds(status);
  const relevant = [];
  if (needs.progress) relevant.push(progressState);
  if (needs.bookmarks) relevant.push(bookmarksState);
  if (relevant.includes('failed')) return 'failed';
  if (relevant.includes('loading')) return 'loading';
  return 'ok';
}

// Count text that never lies: '...' while loading, '-' when the load failed, the real number otherwise.
export function displayCount(state, count) {
  if (state === 'loading') return '...';
  if (state === 'failed') return '-';
  return count;
}

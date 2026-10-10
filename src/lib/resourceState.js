// explicit resource-state contract for personal data (progress, bookmarks). Author: Satvik Hemant Gupta
import { statusNeeds } from './authGate.js';

export function resourceState({ authed, ready, failed }) {
  if (!authed) return 'signed-out';
  if (failed) return 'failed';
  if (!ready) return 'loading';
  return 'ready';
}

// Can the status filter / personal controls be trusted right now
export function personalGate(status, progressState, bookmarksState) {
  const needs = statusNeeds(status);
  const relevant = [];
  if (needs.progress) relevant.push(progressState);
  if (needs.bookmarks) relevant.push(bookmarksState);
  if (relevant.includes('failed')) return 'failed';
  if (relevant.includes('loading')) return 'loading';
  return 'ok';
}

// Count text that never lies: '...' while loading
export function displayCount(state, count) {
  if (state === 'loading') return '...';
  if (state === 'failed') return '-';
  return count;
}

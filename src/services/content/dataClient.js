'use client';

/**
 * Client-side loader for the small static indexes used by interactive list
 * pages (Problems, CpProblems). No Worker, no IndexedDB — deliberately.
 *
 * Those existed in the old app because problems.json/oc.json were
 * 44.5MB/66.7MB; parsing that on the main thread froze the page. The new
 * slim indexes are ~250KB (DSA) / ~700KB (CP) gzipped-JSON — a plain
 * `fetch().then(r => r.json())` is faster than spinning up a worker for
 * this size, and the browser's own HTTP cache (long max-age, see
 * next.config.mjs headers) already gives cross-session caching for free.
 * See docs note in the corrections report: "worker, IndexedDB layer sab
 * delete ho sakta hai — payload itna chhota hai ki wo complexity justify
 * nahi hoti."
 *
 * Per-problem detail content does NOT go through this file — that's
 * server-rendered at build time (see lib/server/content.server.js) and
 * arrives already embedded in the page HTML, no client fetch needed at all.
 */

let dsaIndexPromise = null;
let cpIndexPromise = null;

/*
  BUG-116/117/118/172: a rejected fetch must NOT stay cached, or every retry (React Query included)
  would get the same rejected promise back. On rejection (network error, non-OK status, bad JSON)
  the cache entry is cleared, but only if it is still this same promise, so the next call refetches.
*/
function fetchJson(url, label) {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${label}: ${r.status}`);
    return r.json();
  });
}

export function getDsaIndex() {
  if (!dsaIndexPromise) {
    const promise = fetchJson('/data/problems-index.json', 'problems-index.json').catch((err) => {
      if (dsaIndexPromise === promise) dsaIndexPromise = null;
      throw err;
    });
    dsaIndexPromise = promise;
  }
  return dsaIndexPromise;
}

// BUG-034: returned as generated. The old client-side exclusion of 7 rows is gone, the build no longer emits them.
export function getCpIndex() {
  if (!cpIndexPromise) {
    const promise = fetchJson('/data/cp-index.json', 'cp-index.json').catch((err) => {
      if (cpIndexPromise === promise) cpIndexPromise = null;
      throw err;
    });
    cpIndexPromise = promise;
  }
  return cpIndexPromise;
}

const solutionsPromises = new Map();

/**
 * The other 7 language/variant code blocks a problem page didn't inline
 * (see build-content.mjs's `defaultSolution` split) - fetched once, only
 * if a visitor actually switches away from the default tab, and cached
 * per-slug for the rest of the page's life. Statically pre-rendered on the
 * server (see app/api/solutions/[slug]/route.js), so this is just as fast
 * as a plain static JSON fetch, not a real per-request computation.
 */
export function getSolutions(slug) {
  if (!solutionsPromises.has(slug)) {
    const promise = fetchJson(`/api/solutions/${slug}`, `solutions/${slug}`).catch((err) => {
      if (solutionsPromises.get(slug) === promise) solutionsPromises.delete(slug); // BUG-116
      throw err;
    });
    solutionsPromises.set(slug, promise);
  }
  return solutionsPromises.get(slug);
}

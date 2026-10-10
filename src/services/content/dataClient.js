'use client';

// Client-side loader for the small static indexes used by interactive list pages

let dsaIndexPromise = null;
let cpIndexPromise = null;

// a rejected fetch must NOT stay cached
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

// The other 7 language/variant code blocks a problem page didn't inline
export function getSolutions(slug) {
  if (!solutionsPromises.has(slug)) {
    const promise = fetchJson(`/api/solutions/${slug}`, `solutions/${slug}`).catch((err) => {
      if (solutionsPromises.get(slug) === promise) solutionsPromises.delete(slug);
      throw err;
    });
    solutionsPromises.set(slug, promise);
  }
  return solutionsPromises.get(slug);
}

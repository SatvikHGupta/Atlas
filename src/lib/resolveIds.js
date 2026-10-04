// Resolve stored problem ids (bookmarks, progress) against DSA and CP indexes.
// Author: Satvik Hemant Gupta
//
// Bookmarks and history used to look ids up in the DSA index only, so CP
// items vanished (BUG-040/042/061). The CP index is about 6 MB, so callers
// should load it lazily: use needsCpIndex() to decide if it is needed at all.

// Same rule as getDsaProblemsMap: should_generate === false means not DSA.
function isDsaRow(p) {
  return p.should_generate !== false;
}

function buildDsaMap(dsaIndex) {
  const map = new Map();
  for (const p of dsaIndex || []) if (isDsaRow(p)) map.set(p.canonical_id, p);
  return map;
}

// True when at least one id is not a DSA problem (so it might be CP).
export function needsCpIndex(ids, dsaIndex) {
  if (!ids?.length || !dsaIndex) return false;
  const dsa = buildDsaMap(dsaIndex);
  return ids.some((id) => !dsa.has(id));
}

/*
  @param {string[]} ids
  @param {Array} dsaIndex
  @param {Array|null|undefined} cpIndex  if not loaded yet, ids missing from
         DSA land in `unresolved`: only trust `unresolved` once it has loaded.
  @returns {{items: Array<{id, kind:'dsa'|'cp', problem}>, unresolved: string[]}}
  Input order is kept. items.length + unresolved.length === ids.length.
*/
export function resolveIds(ids, dsaIndex, cpIndex) {
  const dsa = buildDsaMap(dsaIndex);
  let cp = null; // built only if some id is not DSA
  const items = [];
  const unresolved = [];

  for (const id of ids || []) {
    const dsaProblem = dsa.get(id);
    if (dsaProblem) {
      items.push({ id, kind: 'dsa', problem: dsaProblem });
      continue;
    }
    if (!cp) cp = new Map((cpIndex || []).map((p) => [p.canonical_id, p]));
    const cpProblem = cp.get(id);
    if (cpProblem) items.push({ id, kind: 'cp', problem: cpProblem });
    else unresolved.push(id);
  }
  return { items, unresolved };
}

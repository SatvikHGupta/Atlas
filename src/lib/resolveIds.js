// Resolve stored problem ids (bookmarks, progress) against DSA and CP indexes. Author: Satvik Hemant Gupta

// Same rule as getDsaProblemsMap: should_generate === false means not DSA
function isDsaRow(p) {
  return p.should_generate !== false;
}

function buildDsaMap(dsaIndex) {
  const map = new Map();
  for (const p of dsaIndex || []) if (isDsaRow(p)) map.set(p.canonical_id, p);
  return map;
}

// True when at least one id is not a DSA problem (so it might be CP)
export function needsCpIndex(ids, dsaIndex) {
  if (!ids?.length || !dsaIndex) return false;
  const dsa = buildDsaMap(dsaIndex);
  return ids.some((id) => !dsa.has(id));
}

// DSA land in `unresolved`: only trust `unresolved` once it has loaded
export function resolveIds(ids, dsaIndex, cpIndex) {
  const dsa = buildDsaMap(dsaIndex);
  let cp = null;
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

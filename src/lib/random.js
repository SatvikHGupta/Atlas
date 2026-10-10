// Tiny random helpers kept outside components so render code stays pure (react-hooks/purity)

// Uniformly random element of a non-empty array, or undefined for an empty one
export function pickRandom(list) {
  if (!list || list.length === 0) return undefined;
  return list[Math.floor(Math.random() * list.length)];
}

// 32-bit FNV-1a, enough to order a list "randomly but repeatably"
export function hashString(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// First `count` items in a stable pseudo-random order that only changes when
export function seededPicks(list, count, seed, keyOf = (x) => String(x)) {
  return [...list]
    .map((item) => ({ item, rank: hashString(`${seed}|${keyOf(item)}`) }))
    .sort((a, b) => a.rank - b.rank || String(keyOf(a.item)).localeCompare(String(keyOf(b.item))))
    .slice(0, count)
    .map((x) => x.item);
}

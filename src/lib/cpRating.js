// Codeforces mapping and display-rating helpers for CP rows. Author: Satvik Hemant Gupta

// null for "Unrated", '', null, undefined, 0 or anything non numeric
export function parseRating(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Every Codeforces mapping on a problem, in source order
export function getCpMappings(problem) {
  const list = problem?.source_platforms;
  if (!Array.isArray(list)) return [];
  return list.filter((p) => p.platform === 'codeforces');
}

export function getMappingRating(mapping) {
  return parseRating(mapping?.difficulty_original);
}

// First rated mapping, else the first mapping, else null
export function getPrimaryMapping(problem) {
  const mappings = getCpMappings(problem);
  const rated = mappings.find((m) => getMappingRating(m) !== null);
  return rated || mappings[0] || null;
}

// rating of the first mapping that has one, else null
export function getDisplayRating(problem) {
  const rated = getCpMappings(problem).find(
    (m) => getMappingRating(m) !== null,
  );
  return rated ? getMappingRating(rated) : null;
}

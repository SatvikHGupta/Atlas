/**
 * Ports the runtime merge that used to happen in the backend's
 * problem.service.js `getProblemBySlug` (problem record + matching
 * oc.json record, spread together, oc fields winning on conflict).
 *
 * Only called for `should_generate: true` problems - CP/Codeforces
 * pass-through problems never have an oc.json entry and must not go
 * through this path (see dataClient.getProblemDetail).
 */
export function mergeOcRecord(problem, ocRecord) {
  if (!ocRecord) return problem; // no oc entry found - return problem as-is, caller may warn
  return { ...problem, ...ocRecord };
}

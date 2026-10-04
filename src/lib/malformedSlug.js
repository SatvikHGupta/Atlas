// One pattern for every malformed legacy problem slug (leading or trailing hyphen). Valid slugs never start or end
// with a hyphen (see lib/slugValidation.js), so this cannot catch a real page. Used by next.config.mjs (PERF-03).
export const MALFORMED_SLUG_PATTERN = '-[a-z0-9-]*|[a-z0-9-]*-';
export const MALFORMED_SLUG_RE = new RegExp(`^(?:${MALFORMED_SLUG_PATTERN})$`);

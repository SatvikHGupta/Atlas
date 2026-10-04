// Strict slug check for route params and content lookups. Author: Satvik Hemant Gupta

// BUG-141: lowercase alphanumeric words joined by single hyphens, nothing else.
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// True only for a canonical slug. Never cleans the input into another slug.
export function isValidSlug(value) {
  return typeof value === 'string' && SLUG_PATTERN.test(value);
}

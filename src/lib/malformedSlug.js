// One pattern for every malformed legacy problem slug (leading or trailing hyphen)
export const MALFORMED_SLUG_PATTERN = '-[a-z0-9-]*|[a-z0-9-]*-';
export const MALFORMED_SLUG_RE = new RegExp(`^(?:${MALFORMED_SLUG_PATTERN})$`);

// Cache-Control values shared by next.config.mjs and route handlers. Author: Satvik Hemant Gupta

// BUG-119, 121, 173: generated JSON is served from URLs that are not
// content-versioned, so no year-long "immutable". Five minutes in browsers,
// an hour on the CDN, then serve stale while revalidating for a day.
export const CACHE_CONTENT =
  'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';

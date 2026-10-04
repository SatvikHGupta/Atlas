// Clearbit's free logo API (logo.clearbit.com) shut down for good on 8 Dec 2025 - every request now fails, silently
// falling back to the initials badge in CompanyBadge. This replaces the name-keyed Clearbit map with a domain-keyed
// fallback CHAIN, since `domain` now comes straight from raw-data/company-sources/registry.json (see index.json /
// companies/<id>.json) instead of being looked up by display-name string (fragile - e.g. "X (Twitter)" never matched
// a plain-text key).
//
// Chain, in order:
//   1. Logo.dev  - the official Clearbit migration path, best quality, but needs a free publishable token.
//                  Set NEXT_PUBLIC_LOGO_DEV_TOKEN in .env.local (Next.js inlines NEXT_PUBLIC_* at build time) to
//                  enable it; until then this candidate is skipped entirely, no broken requests.
//   2. Google's public favicon service - no signup, works today, lower quality (it's a favicon, not a logo).
//   3. (caller's responsibility) initials badge, once every URL in the chain has failed to load.
//
// CompanyBadge.jsx drives the sequence itself (tries candidate[0], onError moves to candidate[1], etc.) so a single
// dead domain doesn't take the whole badge down with it.
export function logoCandidates(domain, size = 80) {
  if (!domain) return [];
  const urls = [];
  const logoDevToken = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;
  if (logoDevToken) urls.push(`https://img.logo.dev/${domain}?token=${logoDevToken}&size=${size}&format=png`);
  urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`);
  return urls;
}

export function websiteUrl(domain) {
  return domain ? `https://${domain}` : null;
}

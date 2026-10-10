// Clearbit's free logo API (logo.clearbit.com) shut down for good on 8 Dec 2025
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

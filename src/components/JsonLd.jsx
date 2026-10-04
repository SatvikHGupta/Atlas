import { safeJsonLd } from '../lib/jsonld.js';

// Server-safe - just prints a <script> tag, no client JS. BUG-151: the payload goes through safeJsonLd() so a title containing </script> cannot close the tag, even though the data comes from our own build-time schema helpers.
export default function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(Array.isArray(data) ? data : [data]) }}
    />
  );
}

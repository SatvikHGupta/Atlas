import { safeJsonLd } from '../lib/jsonld.js';

// Server-safe - just prints a <script> tag, no client JS
export default function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(Array.isArray(data) ? data : [data]) }}
    />
  );
}

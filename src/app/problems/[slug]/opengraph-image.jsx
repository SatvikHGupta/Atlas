import { ImageResponse } from 'next/og';
import { ogTemplate, OG_SIZE, OG_CONTENT_TYPE } from '../../../lib/og.jsx';
import { getDifficultyBucket } from '../../../lib/difficulty.utils.js';
import { getProblemBundle } from '../../../lib/server/content.server.js';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Deliberately NOT statically pre-rendered for all 3,114 problems - an OG image is only ever fetched when a link actually gets shared, which is rare per-problem, so paying render cost for every single one at every build would be a bad trade (build time up, actual usage near zero). Rendered on first real request instead and cached by the host from there. Companies/patterns/notes (much smaller counts, ~250 total combined) ARE pre-rendered at build time - see their opengraph-image.jsx.
export const dynamic = 'force-dynamic';

// Rendered on demand (force-dynamic above), never prerendered; unknown slugs still get a plain fallback card.

const difficultyLabel = (score) => getDifficultyBucket(score) ?? '';

export default async function Image({ params }) {
  const { slug } = await params;
  const problem = getProblemBundle(slug);

  return new ImageResponse(
    ogTemplate({
      eyebrow: problem ? `${difficultyLabel(problem.difficulty)} - DSA Problem` : 'Atlas',
      title: problem?.title || 'Problem not found',
      subtitle: problem?.patterns?.slice(0, 3).join(' - ') || undefined,
    }),
    { ...size }
  );
}

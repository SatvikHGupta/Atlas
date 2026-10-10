import { ImageResponse } from 'next/og';
import { ogTemplate, OG_SIZE, OG_CONTENT_TYPE } from '../../../lib/og.jsx';
import { getDifficultyBucket } from '../../../lib/difficulty.utils.js';
import { getProblemBundle } from '../../../lib/server/content.server.js';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export const dynamic = 'force-dynamic';

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

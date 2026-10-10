import { ImageResponse } from 'next/og';
import { ogTemplate, OG_SIZE, OG_CONTENT_TYPE } from '../../../lib/og.jsx';
import { getPatternDetail, getAllPatternIndexRows, getTopicPatternEntry } from '../../../lib/server/content.server.js';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPatternIndexRows().map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }) {
  const { slug } = await params;
  const entry = getPatternDetail(slug) || getTopicPatternEntry(slug);

  return new ImageResponse(
    ogTemplate({
      eyebrow: 'Interview Pattern',
      title: entry?.pattern || 'Pattern not found',
      subtitle: entry
        ? (entry.companiesSeenIn > 0 ? `${entry.totalProblemsInPool} problems - asked at ${entry.companiesSeenIn} companies` : `${entry.totalProblemsInPool} problems`)
        : undefined,
    }),
    { ...size }
  );
}

import { ImageResponse } from 'next/og';
import { ogTemplate, OG_SIZE, OG_CONTENT_TYPE } from '../../../lib/og.jsx';
import { getNoteContent, getAvailableNoteSlugs } from '../../../lib/server/content.server.js';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// PERF-04: unknown ids 404 instead of returning a 200 "not found" image
export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from(getAvailableNoteSlugs()).map((slug) => ({ slug }));
}

export default async function Image({ params }) {
  const { slug } = await params;
  const note = getNoteContent(slug);

  return new ImageResponse(
    ogTemplate({
      eyebrow: 'Atlas Notes',
      title: note?.topic || 'Note not found',
      subtitle: note?.estimated_read ? `${note.estimated_read} read` : undefined,
      accent: '#06b6d4',
    }),
    { ...size }
  );
}

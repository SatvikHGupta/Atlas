import { ImageResponse } from 'next/og';
import { ogTemplate, OG_SIZE, OG_CONTENT_TYPE } from '../../../lib/og.jsx';
import { getCompanyDetail, getCompanyIndex } from '../../../lib/server/content.server.js';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export const dynamicParams = false;

export function generateStaticParams() {
  return getCompanyIndex().map((c) => ({ id: c.id }));
}

export default async function Image({ params }) {
  const { id } = await params;
  const data = getCompanyDetail(id);

  return new ImageResponse(
    ogTemplate({
      eyebrow: 'Company Interview Patterns',
      title: data?.name || 'Company not found',
      subtitle: data ? `${data.problems?.length ?? 0} problems tracked - Tier ${data.tier}` : undefined,
    }),
    { ...size }
  );
}

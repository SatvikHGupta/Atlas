import { NextResponse } from 'next/server';
import { getAllProblemSlugs, getSolutions } from '../../../../lib/server/content.server.js';
import { CACHE_CONTENT } from '../../../../lib/cachePolicy.js';

// Pre-rendered at build time for every problem slug
export function generateStaticParams() {
  return getAllProblemSlugs().map((slug) => ({ slug }));
}

export const dynamic = 'force-static';

export async function GET(request, { params }) {
  const { slug } = await params;
  const data = getSolutions(slug);
  if (!data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json(data, {
    headers: { 'Cache-Control': CACHE_CONTENT },
  });
}

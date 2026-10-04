import { NextResponse } from 'next/server';
import { getAllProblemSlugs, getSolutions } from '../../../../lib/server/content.server.js';
import { CACHE_CONTENT } from '../../../../lib/cachePolicy.js';

// Pre-rendered at build time for every problem slug, same as any other static route here - not computed per-request. The JSON is generated at build time (scripts/build-content.mjs), which is why force-static is accurate. This is what keeps the lazy-fetch in SolutionViewer.jsx just as fast as if the data had been embedded in the page, without actually embedding it (see the `defaultSolution` doc comment in scripts/build-content.mjs for why that mattered: it was 98% of the heaviest problem pages' weight).
export function generateStaticParams() {
  return getAllProblemSlugs().map((slug) => ({ slug }));
}

export const dynamic = 'force-static';

export async function GET(request, { params }) {
  const { slug } = await params;
  // BUG-141: an invalid or unknown slug is a 404, getSolutions never "cleans" it.
  const data = getSolutions(slug);
  if (!data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  // BUG-119: no `immutable`, the URL is not versioned by content.
  return NextResponse.json(data, {
    headers: { 'Cache-Control': CACHE_CONTENT },
  });
}

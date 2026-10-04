import { notFound } from 'next/navigation';
import { ROADMAP_LEVELS } from '../../../constants/roadmap.js';
import { parseLevelParam } from '../../../lib/roadmap.js';
import RoadmapLevelClient from './RoadmapLevelClient.jsx';
import { routes, canonicalAlternates } from '../../../lib/routeIdentity.js';

// BUG-097/142: only the levels generated below exist; anything else is a real 404 instead of an empty page.
export const dynamicParams = false;

// Levels come from the actual ROADMAP_LEVELS constant - add a level there and it gets a route on the next build, no route file changes needed.
export function generateStaticParams() {
  return ROADMAP_LEVELS.map((l) => ({ level: String(l.level) }));
}

export async function generateMetadata({ params }) {
  params = await params;
  const levelNum = parseLevelParam(params.level);
  if (levelNum === null) return { title: 'Not found - Atlas Roadmap' };
  const info = ROADMAP_LEVELS[levelNum];
  return {
    title: `${info?.title || `Level ${levelNum}`} - Atlas Roadmap`,
    alternates: canonicalAlternates(routes.roadmapLevel(levelNum)),
  };
}

export default async function RoadmapLevelPage({ params }) {
  params = await params;
  const levelNum = parseLevelParam(params.level); // rejects 1abc, 999, foo, 01, -1, 1.5
  if (levelNum === null) notFound();
  return <RoadmapLevelClient levelNum={levelNum} />;
}

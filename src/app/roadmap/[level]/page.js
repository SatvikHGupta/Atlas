import { notFound } from 'next/navigation';
import { ROADMAP_LEVELS } from '../../../constants/roadmap.js';
import { parseLevelParam } from '../../../lib/roadmap.js';
import RoadmapLevelClient from './RoadmapLevelClient.jsx';
import { routes, canonicalAlternates } from '../../../lib/routeIdentity.js';

export const dynamicParams = false;

// Levels come from the actual ROADMAP_LEVELS constant
export function generateStaticParams() {
  return ROADMAP_LEVELS.map((l) => ({ level: String(l.level) }));
}

export async function generateMetadata({ params }) {
  params = await params;
  const levelNum = parseLevelParam(params.level);
  if (levelNum === null) return { title: 'Not found' };
  const info = ROADMAP_LEVELS[levelNum];
  return {
    title: info?.title || `Level ${levelNum}`,
    alternates: canonicalAlternates(routes.roadmapLevel(levelNum)),
  };
}

export default async function RoadmapLevelPage({ params }) {
  params = await params;
  const levelNum = parseLevelParam(params.level);
  if (levelNum === null) notFound();
  return <RoadmapLevelClient levelNum={levelNum} />;
}

import RoadmapClient from './RoadmapClient.jsx';
import { UNLOCK_THRESHOLD } from '../../constants/roadmap.js';
import { routes, canonicalAlternates } from '../../lib/routeIdentity.js';

export const metadata = {
  alternates: canonicalAlternates(routes.roadmap()),
  title: 'Atlas Roadmap - Guided DSA Progression',
  description: `A structured level-by-level DSA roadmap - complete ${UNLOCK_THRESHOLD} problems in every topic of a level to unlock the next.`,
};

export default function RoadmapPage() {
  return <RoadmapClient />;
}

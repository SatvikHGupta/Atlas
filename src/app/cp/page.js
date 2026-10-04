import { getCpIndex } from '../../lib/server/content.server.js';
import CpProblemsClient from './CpProblemsClient.jsx';
import { routes, canonicalAlternates } from '../../lib/routeIdentity.js';

export function generateMetadata() {
  const count = getCpIndex().length;
  return {
    alternates: canonicalAlternates(routes.cp()),
    title: `Competitive Programming Problems (${count.toLocaleString()}) - Atlas`,
    description: `${count.toLocaleString()} Codeforces problems, searchable by title, topic and problem code - solve directly on Codeforces.`,
  };
}

export default function CpPage() {
  return <CpProblemsClient />;
}

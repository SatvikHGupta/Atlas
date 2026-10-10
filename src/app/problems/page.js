import { Suspense } from 'react';
import { FullPageLoader } from '../../components/ui/Loader/Loader.jsx';
import { getDsaIndex } from '../../lib/server/content.server.js';
import ProblemsClient from './ProblemsClient.jsx';
import { routes, canonicalAlternates } from '../../lib/routeIdentity.js';

// Count is read from actual data, not hand-typed - see content.server.js
export function generateMetadata() {
  const count = getDsaIndex().length;
  return {
    alternates: canonicalAlternates(routes.problems()),
    title: 'DSA Problems',
    description: `Browse ${count.toLocaleString()} data structures and algorithms problems with worked explanations and solutions in JavaScript, C++, Java, and Python.`,
  };
}

// ProblemsClient reads useSearchParams to initialise filters from the URL
export default function ProblemsPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <ProblemsClient />
    </Suspense>
  );
}

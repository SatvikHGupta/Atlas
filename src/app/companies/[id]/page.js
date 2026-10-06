import { notFound } from 'next/navigation';
import { getCompanyIndex, getCompanyDetail } from '../../../lib/server/content.server.js';
import { breadcrumbSchema } from '../../../lib/jsonld.js';
import { routes, canonicalAlternates } from '../../../lib/routeIdentity.js';
import JsonLd from '../../../components/JsonLd.jsx';
import CompanyDetailClient from '../../../components/company/CompanyDetailClient.jsx';

// BUG-125: only ids in the company index exist, anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getCompanyIndex().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }) {
  params = await params;
  const data = getCompanyDetail(params.id);
  if (!data) return { title: 'Company not found' };
  return {
    alternates: canonicalAlternates(routes.company(params.id)),
    title: `${data.name} Questions`, // becomes "Google Questions | Atlas"
    description: `${data.problemCount ?? data.problems?.length ?? 0} interview problems tracked for ${data.name}, broken down by role and DSA pattern.`,
  };
}

export default async function CompanyDetailPage({ params }) {
  params = await params;
  const data = getCompanyDetail(params.id);
  if (!data) notFound();
  const jsonLd = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Companies', path: routes.companies() },
    { name: data.name, path: routes.company(params.id) },
  ]);
  return (
    <>
      <JsonLd data={jsonLd} />
      <CompanyDetailClient data={data} />
    </>
  );
}

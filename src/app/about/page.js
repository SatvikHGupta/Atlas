// About Atlas page. Same shell as /terms and /privacy. Author: Satvik Hemant Gupta
import Link from 'next/link';
import LegalPage from '../../components/legal/LegalPage.jsx';
import { routes, canonicalAlternates } from '../../lib/routeIdentity.js';
import { getDsaIndex, getCompanyIndex, getAllPatternIndexRows, getAvailableNoteSlugs } from '../../lib/server/content.server.js';

export const metadata = {
  alternates: canonicalAlternates(routes.about()),
  title: 'About',
  description: 'What Atlas is, what is inside it, and who builds it.',
};

// the numbers come from the same indexes the rest of the site uses, so this page never goes stale
export default function AboutPage() {
  const dsa = getDsaIndex().filter((p) => p.should_generate !== false).length;
  const companies = getCompanyIndex().length;
  const patterns = getAllPatternIndexRows().length;
  const notes = getAvailableNoteSlugs().size;

  return (
    <LegalPage title="About Atlas">
      <p>
        Atlas is a free place to practise data structures, algorithms and competitive programming, and to see what
        interviews actually ask. You can browse everything without an account. Sign in with Google only if you want your
        progress, bookmarks and dashboard saved.
      </p>

      <h2>What is inside</h2>
      <ul>
        <li><b>{dsa.toLocaleString()} DSA problems</b> with explanations, solutions and filters by difficulty, tag, pattern and your own progress.</li>
        <li><b>10,000+ competitive programming problems</b> from Codeforces, searchable by rating and topic. These open on Codeforces.</li>
        <li><b>{companies} company pages</b> showing what gets asked, where and how often, with sources on each page.</li>
        <li><b>{patterns} patterns</b> ranked by how many companies ask them, each with a ready practice set.</li>
        <li><b>{notes} notes</b> and a step by step roadmap to follow when you do not know where to start.</li>
        <li>A <b>dashboard</b> with your streaks, activity and topic strengths, and a card you can post to share your progress.</li>
      </ul>

      <h2>Why it exists</h2>
      <p>
        Practice material is scattered across many sites, and it is hard to tell what is worth your time. Atlas puts the
        problems, the patterns behind them and the companies that ask them in one place, so you can pick what to solve next
        without guessing.
      </p>

      <h2>Who builds it</h2>
      <p>
        Atlas is built and maintained by Satvik Hemant Gupta. Feedback, bug reports and ideas are welcome, see the{' '}
        <Link href="/contact">contact</Link> page. What is stored when you sign in is explained in the{' '}
        <Link href="/privacy">privacy</Link> notice.
      </p>
    </LegalPage>
  );
}

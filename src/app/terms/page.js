import LegalPage from '../../components/legal/LegalPage.jsx';
import { routes, canonicalAlternates } from '../../lib/routeIdentity.js';

export const metadata = {
  alternates: canonicalAlternates(routes.terms()),
  title: 'Terms',
  description: 'The ground rules for using Atlas.',
};

// Plain-language terms, not legal advice
export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="1 October 2026">
      <p>By using Atlas you agree to the points below.</p>

      <h2>Using the site</h2>
      <ul>
        <li>Atlas is free and provided as is, without any guarantee that it is always available or error free.</li>
        <li>Use it for learning. Do not scrape it at a rate that harms the service or try to break into other accounts.</li>
        <li>Your account is yours. Do not share access to it.</li>
      </ul>

      <h2>Solutions and explanations</h2>
      <p>
        Explanations and code are AI-generated and are shown with the result of automated example checks where available.
        They can still be wrong. Always verify them before relying on them, and never submit work to an exam or
        assessment that forbids outside help.
      </p>

      <h2>Problem statements</h2>
      <p>
        Problem names and links point to their original platforms (LeetCode, Codeforces and others), which own their
        content. Atlas is not affiliated with them.
      </p>

      <h2>Your data</h2>
      <p>See the <a href="/privacy">privacy</a> page. You can delete your account at any time from Settings.</p>

      <h2>Changes</h2>
      <p>These terms may change; the date at the top shows the latest version.</p>
    </LegalPage>
  );
}

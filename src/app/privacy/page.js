import LegalPage from '../../components/legal/LegalPage.jsx';
import { routes, canonicalAlternates } from '../../lib/routeIdentity.js';

export const metadata = {
  alternates: canonicalAlternates(routes.privacy()),
  title: 'Privacy',
  description: 'What Atlas stores about you, where it is stored, and how to delete it.',
};

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

/* SEC-12. This text describes what the code actually does today (checked against src/services/*). It is a plain-language
   notice, not legal advice: have it reviewed for the regions you serve (India DPDP Act, EU GDPR, ...) and update the
   date whenever data handling changes. */
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="1 October 2026">
      <p>
        Atlas is a free practice site. You can browse everything without an account. This page explains what is stored
        when you do sign in.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          <b>Sign-in:</b> Google sign-in is handled by Firebase Authentication (Google). Firebase holds your account id,
          email address, name and profile photo. Atlas does not copy your name or photo into its own database.
        </li>
        <li>
          <b>Your progress and bookmarks:</b> which problems you marked solved or attempted, when, and which ones you
          bookmarked. Stored in Cloud Firestore under your account id; only you can read or write them.
        </li>
        <li>
          <b>A small account record:</b> the time your account was created and when you last visited.
        </li>
      </ul>

      <h2>What stays on your device</h2>
      <ul>
        <li>A copy of your progress and bookmarks (browser storage) so pages load fast and work offline.</li>
        <li>Your theme choice and filter settings.</li>
      </ul>
      <p>These copies are removed when you sign out or delete your account.</p>

      <h2>Third parties</h2>
      <ul>
        <li>Google / Firebase: sign-in, database and hosting of your data.</li>
        <li>
          Company logos on company pages are loaded from Google&apos;s favicon service (and Logo.dev when configured).
          Your browser contacts them when those pages are opened; no account information is sent.
        </li>
        <li>Atlas does not run advertising or analytics trackers.</li>
      </ul>

      <h2>Deleting your data</h2>
      <p>
        Open Settings, then Account, then Delete account. This removes your progress, bookmarks, account record and your
        sign-in. You can also reset only your progress there.
      </p>

      <h2>Contact</h2>
      <p>
        {CONTACT ? <>Questions or requests: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</> : 'Questions or requests: contact the site owner through the project page.'}
      </p>
    </LegalPage>
  );
}

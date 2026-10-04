import { getDsaIndex, getCpIndex, getNotesIndex } from '../../lib/server/content.server.js';
import { Suspense } from 'react';
import { FullPageLoader } from '../../components/ui/Loader/Loader.jsx';
import LoginClient from './LoginClient.jsx';

export const metadata = { title: 'Sign in - Atlas' };

export default function LoginPage() {
  // BUG FIX / dynamic count: every number in the marketing copy is computed from the real indexes here (nothing hand-typed, no "+" suffix on an exact count) - it moves on its own as the dataset grows, never needs editing.
  return (
    <Suspense fallback={<FullPageLoader />}>
      <LoginClient
        dsaCount={getDsaIndex().length}
        cpCount={getCpIndex().length}
        notesCount={getNotesIndex().ready}
      />
    </Suspense>
  );
}

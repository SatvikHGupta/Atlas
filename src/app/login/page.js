import { Suspense } from 'react';
import { FullPageLoader } from '../../components/ui/Loader/Loader.jsx';
import LoginClient from './LoginClient.jsx';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <LoginClient />
    </Suspense>
  );
}

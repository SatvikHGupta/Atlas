import { FullPageLoader } from '../components/ui/Loader/Loader.jsx';

// RES-01: shown while a route segment is streaming in (client navigation to a big page).
export default function Loading() {
  return <FullPageLoader />;
}

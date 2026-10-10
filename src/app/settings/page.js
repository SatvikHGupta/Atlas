import SettingsIndexClient from './SettingsIndexClient.jsx';

export const metadata = { title: 'Settings', robots: { index: false, follow: false } };

// Bare /settings has no content of its own
export default function SettingsPage() {
  return <SettingsIndexClient />;
}

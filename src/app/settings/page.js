import SettingsIndexClient from './SettingsIndexClient.jsx';

export const metadata = { title: 'Settings - Atlas', robots: { index: false, follow: false } };

// Bare /settings has no content of its own: it sends the visitor to a real section.
export default function SettingsPage() {
  return <SettingsIndexClient />;
}

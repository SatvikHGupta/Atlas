import SettingsShell from './SettingsShell.jsx';

export const metadata = {
  description: 'Manage your Atlas profile, theme, and account settings.',
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }) {
  return <SettingsShell>{children}</SettingsShell>;
}

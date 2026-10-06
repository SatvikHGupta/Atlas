import SettingsShell from './SettingsShell.jsx';

// Applies to every page under /settings (private, never indexed - also disallowed in robots.js).
export const metadata = {
  title: 'Settings', // sub pages (Profile, Account, Appearance) set their own, the root template adds '| Atlas'
  description: 'Manage your Atlas profile, theme, and account settings.',
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }) {
  return <SettingsShell>{children}</SettingsShell>;
}

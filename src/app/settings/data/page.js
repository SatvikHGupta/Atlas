// Data now lives under Profile; this keeps old /settings/data links working. Author: Satvik Hemant Gupta
import { redirect } from 'next/navigation';

export const metadata = { title: 'Data' };

export default function SettingsDataPage() {
  redirect('/settings/profile');
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth.js';
import { Loader } from '../../components/ui/Loader/Loader.jsx';
import { defaultSectionSlug, settingsPath } from '../../constants/settingsSections.js';
import styles from './Settings.module.css';

// Signed-in visitors land on Profile, signed-out on Appearance (the only page that works without an account).
export default function SettingsIndexClient() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) router.replace(settingsPath(defaultSectionSlug(isAuthenticated)));
  }, [loading, isAuthenticated, router]);

  return <div className={styles.loading}><Loader size={32} /></div>;
}
